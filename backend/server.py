from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os, logging, uuid, json, asyncio, io, zipfile
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from supabase import create_client, Client
from github import Github, GithubException
from llm_router import llm_call as router_call
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALG = 'HS256'
JWT_EXP_DAYS = 7
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')  # legacy, unused
WA_SERVICE_URL = os.environ.get('WA_SERVICE_URL', 'http://localhost:8002')
APP_PUBLIC_URL = os.environ.get('APP_PUBLIC_URL', 'https://jarvisagent.app')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
STRIPE_PRICE_STARTER = os.environ.get('STRIPE_PRICE_STARTER', '')
STRIPE_PRICE_PRO = os.environ.get('STRIPE_PRICE_PRO', '')
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'http://localhost:3000')

sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Jarvis API")
api_router = APIRouter(prefix="/api")
log = logging.getLogger("jarvis")

@app.get("/")
@app.get("/health")
@app.get("/api")
async def health_check():
    return {"status": "ok", "message": "Jarvis Service Online"}

# ============ MODELS ============
class UserSignup(BaseModel):
    email: EmailStr; password: str; name: str
class UserLogin(BaseModel):
    email: EmailStr; password: str
class UserOut(BaseModel):
    id: str; email: str; name: str; created_at: str
class TokenResponse(BaseModel):
    access_token: str; token_type: str = "bearer"; user: UserOut

class ChatMessageIn(BaseModel):
    session_id: str; message: str; assistant_id: str = "jarvis"

class PluginToggleIn(BaseModel):
    plugin_id: str; plugin_name: str; action: str

class TaskIn(BaseModel):
    title: str; schedule: Optional[str] = None; plugins: List[str] = []

class ProjectCreate(BaseModel):
    description: str  # natural language description of app to build

class PlanApprove(BaseModel):
    project_id: str

class FileUpdate(BaseModel):
    path: str; content: str; language: Optional[str] = "plaintext"

# ============ HELPERS ============
def hash_password(p): return pwd_context.hash(p)
def verify_password(p, h): return pwd_context.verify(p, h)
def create_token(user_id):
    return jwt.encode({"sub": user_id,
                       "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
                       "iat": datetime.now(timezone.utc)}, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    res = sb.table("jarvis_users").select("*").eq("id", user_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="User not found")
    return res.data[0]

# ============ AUTH ============
@api_router.get("/")
async def root(): return {"status": "ok", "message": "Jarvis API running"}

@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(payload: UserSignup):
    email = payload.email.lower()
    existing = sb.table("jarvis_users").select("id").eq("email", email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    doc = {"id": uid, "email": email, "name": payload.name, "password_hash": hash_password(payload.password)}
    sb.table("jarvis_users").insert(doc).execute()
    user = sb.table("jarvis_users").select("*").eq("id", uid).single().execute().data
    return TokenResponse(access_token=create_token(uid),
                         user=UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"]))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    res = sb.table("jarvis_users").select("*").eq("email", payload.email.lower()).limit(1).execute()
    if not res.data or not verify_password(payload.password, res.data[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    u = res.data[0]
    return TokenResponse(access_token=create_token(u["id"]),
                         user=UserOut(id=u["id"], email=u["email"], name=u["name"], created_at=u["created_at"]))

@api_router.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])

# ============ SUPABASE OAUTH EXCHANGE ============
class SupabaseExchangeIn(BaseModel):
    access_token: str
    email: str
    name: Optional[str] = None

@api_router.post("/auth/supabase-exchange", response_model=TokenResponse)
async def supabase_exchange(payload: SupabaseExchangeIn):
    """Exchange a Supabase OAuth access_token for a Jarvis JWT."""
    # Verify the token is valid by calling Supabase's user endpoint
    async with httpx.AsyncClient() as cli:
        r = await cli.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"Authorization": f"Bearer {payload.access_token}", "apikey": SUPABASE_SERVICE_KEY}
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Supabase token")
    sb_user = r.json()
    email = sb_user.get("email") or payload.email
    email = email.lower()
    name = payload.name or email.split("@")[0]
    # Upsert user in jarvis_users
    existing = sb.table("jarvis_users").select("*").eq("email", email).limit(1).execute()
    if existing.data:
        u = existing.data[0]
        # Update name from OAuth if not set
        if not u.get("name") and name:
            sb.table("jarvis_users").update({"name": name}).eq("id", u["id"]).execute()
            u["name"] = name
    else:
        uid = str(uuid.uuid4())
        doc = {"id": uid, "email": email, "name": name, "password_hash": hash_password(str(uuid.uuid4()))}
        sb.table("jarvis_users").insert(doc).execute()
        u = sb.table("jarvis_users").select("*").eq("id", uid).single().execute().data
    return TokenResponse(
        access_token=create_token(u["id"]),
        user=UserOut(id=u["id"], email=u["email"], name=u["name"] or name, created_at=u["created_at"])
    )

# ============ CHAT ============
ASSISTANT_PERSONAS = {
    "jarvis": "You are Jarvis, a highly capable personal AI assistant. You handle tasks, manage projects, and act as the central hub for the user's digital life. You are helpful, proactive, and efficient. You are NOT the coder; your job is to coordinate and assist the user.",
    "judy": "You are Judy, a Sales lead AI assistant. Track pipelines, prep pitches. Be friendly and goal-driven.",
    "alfred": "You are Alfred, an Executive assistant AI. Manage calendars, draft emails. Polite, organized, meticulous.",
    "venus": "You are Venus, a Content marketer AI. Write posts, plan content. Creative, on-brand, engaging.",
    "donna": "You are Donna, a Personal assistant AI. Sort the day, handle to-dos. Warm, efficient, proactive.",
}

@api_router.get("/chat/sessions")
async def list_sessions(user=Depends(get_current_user)):
    res = sb.table("jarvis_chat_sessions").select("*").eq("user_id", user["id"]).order("updated_at", desc=True).limit(100).execute()
    return res.data

@api_router.post("/chat/sessions")
async def create_session(assistant_id: str = "jarvis", user=Depends(get_current_user)):
    if assistant_id not in ASSISTANT_PERSONAS: assistant_id = "jarvis"
    sid = str(uuid.uuid4())
    doc = {"id": sid, "user_id": user["id"], "title": "New chat", "assistant_id": assistant_id}
    sb.table("jarvis_chat_sessions").insert(doc).execute()
    return sb.table("jarvis_chat_sessions").select("*").eq("id", sid).single().execute().data

@api_router.get("/chat/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, user=Depends(get_current_user)):
    sess = sb.table("jarvis_chat_sessions").select("*").eq("id", session_id).eq("user_id", user["id"]).limit(1).execute()
    if not sess.data: raise HTTPException(404, "Session not found")
    return sb.table("jarvis_chat_messages").select("*").eq("session_id", session_id).order("created_at").execute().data

@api_router.delete("/chat/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    sess = sb.table("jarvis_chat_sessions").select("id").eq("id", session_id).eq("user_id", user["id"]).execute()
    if not sess.data: raise HTTPException(404, "Session not found")
    sb.table("jarvis_chat_sessions").delete().eq("id", session_id).execute()
    return {"ok": True}

def _summarize_project(p: dict) -> str:
    plan = p.get("plan") or {}
    tech = plan.get("tech_stack", {})
    tech_str = f"{tech.get('frontend', '')} / {tech.get('backend', '')} / {tech.get('database', '')}".strip(" /")
    steps_done = len([s for s in plan.get("steps", []) if s.get("done")])
    steps_total = len(plan.get("steps", []))
    files_count = 0
    try:
        files_count = sb.table("jarvis_project_files").select("id", count="exact").eq("project_id", p["id"]).execute().count or 0
    except Exception: pass
    
    # Get latest activity feed
    activity = ""
    try:
        jobs = sb.table("jarvis_agent_jobs").select("*").eq("project_id", p["id"]).order("created_at", desc=True).limit(3).execute().data
        if jobs:
            activity = "\n  Latest Activity:\n" + "\n".join([f"    - {j['agent_type']} ({j['status']}): {j['payload'].get('path') or j['payload'].get('instruction') or 'Processing...'}" for j in jobs])
    except Exception: pass

    return (
        f"- Project: {p['name']} (ID: {p['id']}, status: {p.get('status', 'unknown')})\n"
        f"  Description: {p.get('description', '')[:120]}\n"
        f"  Tech: {tech_str or 'not planned yet'}\n"
        f"  Progress: {steps_done}/{steps_total} steps, {files_count} files generated{activity}\n"
        f"  Summary: {plan.get('summary', '')[:150]}"
    )

BUILDER_AWARE_SYSTEM = """You are Jarvis, a highly capable personal AI assistant.

You have FULL visibility into the user's App Builder projects and connected plugins. You are the relay between the user and the specialized agents (Coder, Task Worker).

YOU MUST USE YOUR TOOLS:
When the user asks for information that requires web search or external data, you MUST use your connected plugins (e.g., 'Google Search').
If a tool is connected, use it. Do not just reply, take action.

YOUR ROLE:
1. PERSONAL ASSISTANT: Help the user with general tasks, questions, and coordination.
2. STATUS REPORTER: When asked about a project, summarize the recent activity.
3. RELAY TO BUILDER: For development tasks, respond with BUILDER_ACTION: <instruction>.
4. RELAY TO TASKS: For automations, respond with TASK_ACTION: <description>.
5. TOOL USE: When using a tool, output your tool-use actions in the format:
TOOL_ACTION: <name_of_tool> | <instruction/query>

BUILDER INTEGRATION:
To relay an instruction to the App Builder, output EXACTLY:
BUILDER_ACTION: <clear instruction for the builder>

TASK INTEGRATION:
To relay an automation task, output EXACTLY:
TASK_ACTION: <clear description of the automation task>

Example:
User: "Search for the latest news on AI."
Jarvis: I'll search that for you right now.
TOOL_ACTION: Google Search | latest news on AI

When answering general questions without requiring tools, just reply naturally.
Always be concise, proactive, and keep the user informed via Telegram about the progress."""

@api_router.post("/chat/send")
async def send_message(payload: ChatMessageIn, user=Depends(get_current_user)):
    # check credits instead of quota
    _check_credits(user["id"], required=1.0) # Minimum 1 credit to start chat
    sess = sb.table("jarvis_chat_sessions").select("*").eq("id", payload.session_id).eq("user_id", user["id"]).limit(1).execute()
    if not sess.data: raise HTTPException(404, "Session not found")

    user_msg = {"id": str(uuid.uuid4()), "session_id": payload.session_id, "role": "user",
                "content": payload.message, "assistant_id": "jarvis"}
    sb.table("jarvis_chat_messages").insert(user_msg).execute()

    # Build system prompt with project context
    sysm = BUILDER_AWARE_SYSTEM
    try:
        custom = sb.table("jarvis_personas").select("*").eq("user_id", user["id"]).eq("assistant_id", "jarvis").execute()
        if custom.data and custom.data[0].get("system_prompt"):
            sysm = custom.data[0]["system_prompt"] + "\n\n" + BUILDER_AWARE_SYSTEM
    except Exception: pass

    # Inject project context
    try:
        projects = sb.table("jarvis_projects").select("*").eq("user_id", user["id"]).order("updated_at", desc=True).limit(5).execute().data
        if projects:
            project_ctx = "\n\nUSER'S CURRENT PROJECTS:\n" + "\n".join(_summarize_project(p) for p in projects)
            sysm += project_ctx
    except Exception: pass

    # Inject connected plugins
    try:
        plugs = sb.table("jarvis_plugins").select("*").eq("user_id", user["id"]).eq("status", "connected").execute()
        if plugs.data:
            names = ", ".join(p["plugin_name"] for p in plugs.data)
            sysm += f"\n\nUser has these tools connected: {names}."
    except Exception: pass

    try:
        prior = sb.table("jarvis_chat_messages").select("*").eq("session_id", payload.session_id).order("created_at").execute().data
        prior = [p for p in prior if p["id"] != user_msg["id"]][-10:]
        ctx = "".join(f"\n{'User' if m['role']=='user' else 'Assistant'}: {m['content']}" for m in prior)
        full = (ctx + f"\nUser: {payload.message}").strip() if ctx else payload.message
        
        # Determine agent role for this chat (default to jarvis but can be specialized)
        agent_role = "jarvis"
        if "build" in payload.message.lower() or "project" in payload.message.lower():
            agent_role = "ceo"
        
        res = await router_call(agent_role, sysm, full, sb=sb)
        reply = res["content"]

        # Calculate and consume credits based on tokens
        tokens_used = res.get("usage", {}).get("total_tokens", 0)
        credit_cost = tokens_used * TOKEN_TO_CREDIT_RATE
        _consume_credits(user["id"], credit_cost, f"Chat message: {tokens_used} tokens")

        meta = {"agent_type": agent_role, "model": res.get("model"), "provider": res.get("provider")}
    except Exception as e:
        log.exception("LLM err"); reply = f"(LLM error: {str(e)[:200]})"
        meta = {"agent_type": "error"}
# ============ AUTOMATED DELEGATION ============
async def delegate_task(uid: str, pid: str, instruction: str):
    # Ask CEO agent to determine the best specialist for this task
    prompt = f"User wants: {instruction}\n\nAnalyze this request and determine which of these agents is best suited to execute it: Architect, Backend, Frontend, Infra, Security, Refactor, UX, Research, User_Sim, QA_Test, Bug_Hunter, Performance, Exploit.\n\nReturn ONLY the name of the agent type."
    res = await router_call("ceo", "You are the CEO Agent. Act as a dispatcher.", prompt, sb=sb)
    agent_type = res["content"].strip().lower()

    # Enqueue a job for this agent
    job = {"id": str(uuid.uuid4()), "project_id": pid, "agent_type": agent_type, 
           "status": "queued", "payload": {"instruction": instruction}}
    sb.table("jarvis_agent_jobs").insert(job).execute()
    asyncio.create_task(_run_job(job["id"]))
    return agent_type

# ============ CHAT ============
...
    # Detect actions in response
    builder_action = None
    task_action = None
    display_content = reply

    if "BUILDER_ACTION:" in reply:
        parts = reply.split("BUILDER_ACTION:", 1)
        display_content = parts[0].strip()
        action_text = parts[1].strip().split("\n")[0].strip()

        # Determine project
        projects = sb.table("jarvis_projects").select("id").eq("user_id", user["id"]).order("updated_at", desc=True).limit(1).execute().data
        if projects:
            agent = await delegate_task(user["id"], projects[0]["id"], action_text)
            builder_action = {"description": f"Delegated to {agent}: {action_text}", "agent": agent}

    if "TASK_ACTION:" in reply:
...
        parts = reply.split("TASK_ACTION:", 1)
        if display_content == reply: display_content = parts[0].strip()
        action_text = parts[1].strip().split("\n")[0].strip()
        task_action = {"description": action_text}
        # Enqueue task
        try:
            tid = str(uuid.uuid4())
            sb.table("jarvis_tasks").insert({"id": tid, "user_id": user["id"], "title": action_text, "status": "active"}).execute()
            asyncio.create_task(_run_task(tid))
        except Exception: pass

    if builder_action: meta["builder_action"] = builder_action
    if task_action: meta["task_action"] = task_action

    asst = {"id": str(uuid.uuid4()), "session_id": payload.session_id, "role": "assistant",
            "content": reply, "assistant_id": "jarvis", "metadata": meta}
    sb.table("jarvis_chat_messages").insert(asst).execute()
    _bump_usage(user["id"], "chat")
    title = sess.data[0].get("title") or "New chat"
    if title == "New chat": title = payload.message[:60]
    sb.table("jarvis_chat_sessions").update({"updated_at": datetime.now(timezone.utc).isoformat(), "title": title, "assistant_id": "jarvis"}).eq("id", payload.session_id).execute()

    row = sb.table("jarvis_chat_messages").select("*").eq("id", asst["id"]).single().execute().data
    row["display_content"] = display_content
    if builder_action: row["builder_action"] = builder_action
    if task_action: row["task_action"] = task_action
    return row

# ============ PLUGINS ============
DEFAULT_PLUGINS = [
    {"id": "google", "name": "Google Workspace", "description": "Sheets, Docs, Calendar, Drive", "category": "productivity"},
    {"id": "github", "name": "GitHub", "description": "Repos, issues, pull requests", "category": "developer"},
    {"id": "telegram", "name": "Telegram", "description": "Message Jarvis from Telegram", "category": "messaging"},
    {"id": "google_search", "name": "Google Search", "description": "Search the web", "category": "search"},
    {"id": "youtube", "name": "YouTube", "description": "Search and manage videos", "category": "media"},
]

@api_router.get("/plugins")
async def list_plugins(user=Depends(get_current_user)):
    rows = sb.table("jarvis_plugins").select("*").eq("user_id", user["id"]).execute().data
    by_id = {p["plugin_id"]: p for p in rows}
    out = []
    for p in DEFAULT_PLUGINS:
        ex = by_id.get(p["id"])
        out.append({**p, "status": ex["status"] if ex else "disconnected", "connected_at": ex.get("connected_at") if ex else None})
    return out

@api_router.post("/plugins/toggle")
async def toggle_plugin(payload: PluginToggleIn, user=Depends(get_current_user)):
    if payload.action == "connect":
        existing = sb.table("jarvis_plugins").select("*").eq("user_id", user["id"]).eq("plugin_id", payload.plugin_id).execute()
        doc = {"user_id": user["id"], "plugin_id": payload.plugin_id, "plugin_name": payload.plugin_name,
               "status": "connected", "connected_at": datetime.now(timezone.utc).isoformat(), "metadata": {"mock": True}}
        if existing.data:
            sb.table("jarvis_plugins").update(doc).eq("user_id", user["id"]).eq("plugin_id", payload.plugin_id).execute()
        else:
            doc["id"] = str(uuid.uuid4())
            sb.table("jarvis_plugins").insert(doc).execute()
        return {"status": "connected", "plugin_id": payload.plugin_id}
    sb.table("jarvis_plugins").update({"status": "disconnected"}).eq("user_id", user["id"]).eq("plugin_id", payload.plugin_id).execute()
    return {"status": "disconnected", "plugin_id": payload.plugin_id}

# ============ TASKS ============
# ============ TASKS & AUTOMATIONS ============
async def _get_plugin_token(uid: str, plugin_id: str) -> Optional[str]:
    res = sb.table("jarvis_plugins").select("metadata").eq("user_id", uid).eq("plugin_id", plugin_id).execute()
    if res.data:
        meta = res.data[0].get("metadata") or {}
        # If linked to google, get token from google plugin
        if meta.get("linked_to") == "google":
            return await _get_plugin_token(uid, "google")
        return meta.get("access_token")
    return None

async def _yt_get_stats(token: str, max_results: int = 3):
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    # Get user's channel videos
    async with httpx.AsyncClient() as cli:
        # First get the 'uploads' playlist ID
        r = await cli.get("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true", headers=headers)
        if r.status_code != 200: return f"YT Error: {r.text}"
        uploads_id = r.json()["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        
        # Get last N videos from that playlist
        r = await cli.get(f"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId={uploads_id}&maxResults={max_results}", headers=headers)
        if r.status_code != 200: return f"YT Error: {r.text}"
        items = r.json().get("items", [])
        
        results = []
        for item in items:
            video_id = item["contentDetails"]["videoId"]
            title = item["snippet"]["title"]
            # Get stats for this video
            rs = await cli.get(f"https://www.googleapis.com/youtube/v3/videos?part=statistics&id={video_id}", headers=headers)
            stats = rs.json()["items"][0]["statistics"] if rs.status_code == 200 else {}
            results.append({
                "title": title,
                "views": stats.get("viewCount", "0"),
                "likes": stats.get("likeCount", "0"),
                "comments": stats.get("commentCount", "0")
            })
        return results

async def _sheets_append(token: str, spreadsheet_name: str, rows: List[List[Any]]):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient() as cli:
        # Find the spreadsheet by name
        r = await cli.get(f"https://www.googleapis.com/drive/v3/files?q=name='{spreadsheet_name}' and mimeType='application/vnd.google-apps.spreadsheet'", headers=headers)
        if r.status_code != 200: return f"Drive Error: {r.text}"
        files = r.json().get("files", [])
        if not files:
            # Create if not exists
            r = await cli.post("https://sheets.googleapis.com/v4/spreadsheets", headers=headers, json={"properties": {"title": spreadsheet_name}})
            if r.status_code != 200: return f"Sheets Create Error: {r.text}"
            spreadsheet_id = r.json()["spreadsheetId"]
        else:
            spreadsheet_id = files[0]["id"]
            
        # Append rows
        body = {"values": rows}
        r = await cli.post(f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/A1:append?valueInputOption=USER_ENTERED", 
                           headers=headers, json=body)
        if r.status_code != 200: return f"Sheets Append Error: {r.text}"
        return "success"

async def _run_task(task_id: str):
    task = sb.table("jarvis_tasks").select("*").eq("id", task_id).single().execute().data
    if not task: return
    uid = task["user_id"]
    title = task["title"].lower()
    
    sb.table("jarvis_tasks").update({"status": "processing"}).eq("id", task_id).execute()
    
    try:
        result_msg = "Task completed."
        # YouTube -> Sheets logic
        if "youtube" in title and ("sheet" in title or "stats" in title):
            yt_token = await _get_plugin_token(uid, "youtube")
            gs_token = await _get_plugin_token(uid, "google")
            
            if not yt_token or not gs_token:
                result_msg = "Error: YouTube or Google Sheets not connected."
            else:
                stats = await _yt_get_stats(yt_token)
                if isinstance(stats, str):
                    result_msg = stats
                else:
                    rows = [[datetime.now().strftime("%Y-%m-%d %H:%M"), s["title"], s["views"], s["likes"], s["comments"]] for s in stats]
                    # Add header if needed? Sheets append handles it well
                    res = await _sheets_append(gs_token, "Jarvis Automation Stats", rows)
                    result_msg = f"Successfully exported {len(stats)} video stats to Google Sheets." if res == "success" else res
        
        # Add more automations here...
        else:
            # Generic LLM-powered task handling? 
            # For now, just mark as done if no specific logic
            result_msg = "Task recognized but no specific automation logic implemented for this title yet."

        sb.table("jarvis_tasks").update({"status": "done", "result": result_msg, "finished_at": datetime.now(timezone.utc).isoformat()}).eq("id", task_id).execute()
        
        # If user is on telegram, notify them
        plug = sb.table("jarvis_plugins").select("metadata").eq("user_id", uid).eq("plugin_id", "telegram").execute()
        if plug.data:
            chat_id = plug.data[0].get("metadata", {}).get("telegram_chat_id")
            if chat_id:
                await _tg_send(chat_id, f"✅ Task Finished: {task['title']}\n{result_msg}")

    except Exception as e:
        log.exception("task execution err")
        sb.table("jarvis_tasks").update({"status": "failed", "error": str(e)[:400]}).eq("id", task_id).execute()

@api_router.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    return sb.table("jarvis_tasks").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute().data

@api_router.post("/tasks")
async def create_task(payload: TaskIn, user=Depends(get_current_user)):
    tid = str(uuid.uuid4())
    doc = {"id": tid, "user_id": user["id"], "title": payload.title,
           "schedule": payload.schedule, "plugins": payload.plugins, "status": "active"}
    sb.table("jarvis_tasks").insert(doc).execute()
    asyncio.create_task(_run_task(tid))
    return sb.table("jarvis_tasks").select("*").eq("id", tid).single().execute().data

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    sb.table("jarvis_tasks").delete().eq("id", task_id).eq("user_id", user["id"]).execute()
    return {"ok": True}

# ============ CODE AGENT (IDE) ============
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_BOT_USERNAME = os.environ.get('TELEGRAM_BOT_USERNAME', 'JarvisAgentBot')

# In-memory link codes (short-lived, production should use Redis/DB)
_telegram_link_codes: Dict[str, str] = {}  # code -> user_id

PLAN_SYSTEM = """You are the CEO AGENT, leading a high-performance ensemble of specialized agents to build a world-class application.

YOUR HIERARCHY:
1. CTO AGENT (Architect, Backend, Frontend, Infra, Security, Refactor): Designs technical architecture and ensures code excellence.
2. PRODUCT MANAGER AGENT (UX, Research, User Simulation): Ensures product-market fit and optimal user experience.
3. ORCHESTRATOR KERNEL (Memory, Context Routing, Task Graph, Tool Router, Verification Engine): Manages execution and quality gates.
4. AUTONOMOUS QA SWARM (Test, Bug Hunters, Performance, Security Exploit): Proactively validates every change.

YOUR MISSION:
Convert the user's natural language description into a comprehensive, high-integrity project plan.

Return STRICT JSON ONLY (no prose, no markdown fences) with this exact shape:
{
  "name": "short kebab-case project name",
  "summary": "1-2 line vision statement from the CEO",
  "tech_stack": {"frontend": "React + Tailwind", "backend": "FastAPI + Python", "database": "Supabase Postgres"},
  "architectural_notes": "Key technical decisions from the CTO",
  "ux_vision": "Key user experience principles from the PM",
  "supabase_tables": [{"name": "table_name", "columns": [{"name":"id","type":"uuid","notes":"primary key"}]}],
  "steps": [{"id": 1, "title": "Specific step", "description": "Detailed description", "agent_type": "architect|backend|frontend|infra|security", "files": ["paths"]}],
  "files_to_generate": [{"path": "frontend/src/App.jsx", "purpose": "specific purpose", "agent_type": "frontend|backend|infra"}]
}

!!! CRITICAL RULES !!!
1. EVERY step and file must be assigned to a specific specialized agent type.
2. The plan must include explicit security and verification steps.
3. Use production-ready patterns exclusively."""

CODE_SYSTEM = """You are Jarvis, an autonomous senior full-stack engineer with full terminal access. Given a project plan and a target file path, output ONLY the complete file content (no markdown fences, no commentary). Code must be production-ready, complete, runnable, and specific to the project described. If a package needs to be installed, you can assume it will be available or specify it in terminal commands. Use real-world patterns, never generic boilerplate."""

@api_router.get("/projects")
async def list_projects(user=Depends(get_current_user)):
    return sb.table("jarvis_projects").select("*").eq("user_id", user["id"]).order("updated_at", desc=True).execute().data

@api_router.post("/projects/plan")
async def plan_project(payload: ProjectCreate, user=Depends(get_current_user)):
    pid = str(uuid.uuid4())
    res = await router_call("planner", PLAN_SYSTEM, f"App description: {payload.description}\n\nReturn STRICT JSON ONLY.", sb=sb)
    raw = res["content"]
    raw_clean = raw.strip()
    if raw_clean.startswith("```"):
        raw_clean = raw_clean.split("```")[1]
        if raw_clean.startswith("json"): raw_clean = raw_clean[4:]
        raw_clean = raw_clean.strip().rstrip("`").strip()
    try:
        plan = json.loads(raw_clean)
    except Exception:
        plan = {"name": "untitled", "summary": payload.description[:80], "tech_stack": {}, "supabase_tables": [], "steps": [], "files_to_generate": [], "raw": raw}
    doc = {"id": pid, "user_id": user["id"], "name": plan.get("name", "untitled")[:60],
           "description": payload.description, "status": "planning", "plan": plan}
    sb.table("jarvis_projects").insert(doc).execute()
    return sb.table("jarvis_projects").select("*").eq("id", pid).single().execute().data

@api_router.post("/projects/{pid}/suggest")
async def suggest_continuation(pid: str, user=Depends(get_current_user)):
    """Generate 1-5 suggestions to improve or continue the app."""
    proj = sb.table("jarvis_projects").select("*").eq("id", pid).eq("user_id", user["id"]).single().execute().data
    if not proj: raise HTTPException(404, "Not found")
    prompt = f"Project: {proj['name']}\nDescription: {proj['description']}\n\nBased on this app, suggest 3-5 specific next steps or features to implement. Return a simple JSON list of strings: {{\"suggestions\": [\"...\"]}}"
    try:
        res = await router_call("chat", "You are a product manager.", prompt, sb=sb)
        raw = res["content"].strip()
        if "```" in raw: raw = raw.split("```")[1].replace("json", "").strip()
        data = json.loads(raw)
        return data
    except Exception:
        return {"suggestions": ["Add user profiles", "Integrate analytics", "Improve UI design", "Add dark mode"]}

@api_router.post("/projects/{pid}/build")
async def build_project(pid: str, user=Depends(get_current_user)):
    # check credits instead of quota
    _check_credits(user["id"], required=BUILD_FLAT_FEE)
    proj = sb.table("jarvis_projects").select("*").eq("id", pid).eq("user_id", user["id"]).single().execute().data
    if not proj: raise HTTPException(404, "Not found")
    plan = proj["plan"] or {}
    files_to_gen = plan.get("files_to_generate", [])[:12]
    sb.table("jarvis_projects").update({"status": "building"}).eq("id", pid).execute()
    generated = []
    file_actions = []  # for activity feed
    for f in files_to_gen:
        path = f.get("path") or "untitled.txt"
        purpose = f.get("purpose", "")
        agent_role = f.get("agent_type") or "coder"
        try:
            prompt = f"Project plan:\n{json.dumps(plan, indent=2)[:4000]}\n\nGenerate the COMPLETE content of file: {path}\nPurpose: {purpose}\nReturn ONLY the file content, no markdown fences."
            res = await router_call(agent_role if agent_role != "coder" else "coder", CODE_SYSTEM, prompt, sb=sb)
            content = res["content"].strip()
            if content.startswith("```"):
                lines = content.split("\n"); content = "\n".join(lines[1:-1] if lines[-1].strip().startswith("```") else lines[1:])
            lang = "javascript" if path.endswith((".js", ".jsx")) else "typescript" if path.endswith((".ts", ".tsx")) else "python" if path.endswith(".py") else "json" if path.endswith(".json") else "css" if path.endswith(".css") else "html" if path.endswith(".html") else "sql" if path.endswith(".sql") else "plaintext"
            existing = sb.table("jarvis_project_files").select("id").eq("project_id", pid).eq("path", path).execute()
            if existing.data:
                sb.table("jarvis_project_files").update({"content": content, "language": lang, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("project_id", pid).eq("path", path).execute()
                file_actions.append({"action": "edited", "path": path, "at": datetime.now(timezone.utc).isoformat()})
            else:
                sb.table("jarvis_project_files").insert({"id": str(uuid.uuid4()), "project_id": pid, "path": path, "content": content, "language": lang}).execute()
                file_actions.append({"action": "created", "path": path, "at": datetime.now(timezone.utc).isoformat()})
            generated.append(path)
            # Persist a per-file job for the activity feed
            try:
                job_row = {"id": str(uuid.uuid4()), "project_id": pid, "agent_type": agent_role, "status": "done",
                           "payload": {"path": path, "purpose": purpose},
                           "result": {"actions": [file_actions[-1]], "provider": res.get("provider")},
                           "started_at": datetime.now(timezone.utc).isoformat(),
                           "finished_at": datetime.now(timezone.utc).isoformat()}
                sb.table("jarvis_agent_jobs").insert(job_row).execute()
            except Exception: pass
        except Exception as e:
            log.exception("file gen err %s", path)
    sb.table("jarvis_projects").update({"status": "ready", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", pid).execute()

    # Calculate total tokens used across all generated files for the project build
    total_tokens = 0
    # Since we don't have the LLM responses stored, we'll estimate tokens
    # or ideally, we should have collected them during the loop.
    # For this implementation, we'll use a flat fee + estimated token cost based on generated content.

    generated_content_len = 0
    for path in generated:
        f_data = sb.table("jarvis_project_files").select("content").eq("path", path).eq("project_id", pid).single().execute().data
        if f_data:
            generated_content_len += len(f_data.get("content", ""))

    # Estimate 1 token approx 4 chars
    estimated_tokens = generated_content_len // 4
    build_token_cost = estimated_tokens * TOKEN_TO_CREDIT_RATE

    _consume_credits(user["id"], BUILD_FLAT_FEE + build_token_cost, f"Project build {pid[:8]}: {estimated_tokens} tokens")
    # Update project state
    try:
        sb.table("jarvis_project_state").upsert({
            "project_id": pid, "current_phase": "review",
            "completed_steps": [{"step": "plan"}, {"step": "code", "files": generated}],
            "pending_steps": [{"step": "review"}, {"step": "test"}],
            "last_summary": f"Generated {len(generated)} files. Ready for review.",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception: pass
    # Auto-enqueue a reviewer job in parallel
    try:
        rj = {"id": str(uuid.uuid4()), "project_id": pid, "agent_type": "reviewer", "status": "queued",
              "payload": {"instruction": f"Review the {len(generated)} generated files for this project."}}
        sb.table("jarvis_agent_jobs").insert(rj).execute()
        asyncio.create_task(_run_job(rj["id"]))
    except Exception: pass
    return {"ok": True, "generated": generated}

@api_router.get("/projects/{pid}")
async def get_project(pid: str, user=Depends(get_current_user)):
    proj = sb.table("jarvis_projects").select("*").eq("id", pid).eq("user_id", user["id"]).limit(1).execute().data
    if not proj: raise HTTPException(404, "Not found")
    files = sb.table("jarvis_project_files").select("*").eq("project_id", pid).order("path").execute().data
    return {"project": proj[0], "files": files}

@api_router.put("/projects/{pid}/files")
async def update_file(pid: str, payload: FileUpdate, user=Depends(get_current_user)):
    proj = sb.table("jarvis_projects").select("id").eq("id", pid).eq("user_id", user["id"]).execute()
    if not proj.data: raise HTTPException(404, "Not found")
    existing = sb.table("jarvis_project_files").select("id").eq("project_id", pid).eq("path", payload.path).execute()
    if existing.data:
        sb.table("jarvis_project_files").update({"content": payload.content, "language": payload.language, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("project_id", pid).eq("path", payload.path).execute()
    else:
        sb.table("jarvis_project_files").insert({"id": str(uuid.uuid4()), "project_id": pid, "path": payload.path, "content": payload.content, "language": payload.language}).execute()
    return {"ok": True}

@api_router.delete("/projects/{pid}")
async def delete_project(pid: str, user=Depends(get_current_user)):
    sb.table("jarvis_projects").delete().eq("id", pid).eq("user_id", user["id"]).execute()
    return {"ok": True}

@api_router.post("/projects/{pid}/push-github")
async def push_to_github(pid: str, user=Depends(get_current_user)):
    if not GITHUB_TOKEN:
        raise HTTPException(400, "GITHUB_TOKEN not configured. Add a GitHub Personal Access Token in backend/.env")
    proj = sb.table("jarvis_projects").select("*").eq("id", pid).eq("user_id", user["id"]).single().execute().data
    if not proj: raise HTTPException(404, "Not found")
    files = sb.table("jarvis_project_files").select("*").eq("project_id", pid).execute().data
    try:
        gh = Github(GITHUB_TOKEN)
        gh_user = gh.get_user()
        repo_name = proj["name"] or f"jarvis-app-{pid[:8]}"
        try:
            repo = gh_user.get_repo(repo_name)
        except GithubException:
            repo = gh_user.create_repo(name=repo_name, description=proj.get("description", "Built by Jarvis")[:200], auto_init=True, private=False)
        for f in files:
            try:
                existing = repo.get_contents(f["path"])
                repo.update_file(f["path"], "Update via Jarvis", f["content"], existing.sha)
            except GithubException:
                repo.create_file(f["path"], "Add via Jarvis", f["content"])
        sb.table("jarvis_projects").update({"github_repo": repo_name, "github_url": repo.html_url, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", pid).execute()
        return {"ok": True, "github_url": repo.html_url}
    except Exception as e:
        log.exception("gh err")
        raise HTTPException(500, f"GitHub push failed: {str(e)[:200]}")

# ============ GOOGLE OAUTH ============
import urllib.parse, secrets, httpx
GOOGLE_SCOPES = [
    "openid", "email", "profile",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/youtube.readonly",
]
GOOGLE_REDIRECT = f"{APP_BASE_URL}/api/auth/google/callback"
_oauth_states: Dict[str, str] = {}  # state -> user_id (in-memory short-lived)

@api_router.get("/auth/google/start")
async def google_start(user=Depends(get_current_user)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(400, "Google OAuth not configured")
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = user["id"]
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return {"auth_url": f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"}

@api_router.get("/auth/github/start")
async def github_start(user=Depends(get_current_user)):
    client_id = os.environ.get('GITHUB_CLIENT_ID')
    if not client_id: raise HTTPException(400, "GitHub OAuth not configured")
    state = secrets.token_urlsafe(24); _oauth_states[state] = user["id"]
    params = {"client_id": client_id, "scope": " ".join(["repo", "user", "workflow"]), "state": state}
    return {"auth_url": f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"}

from fastapi.responses import HTMLResponse

@api_router.get("/auth/google/callback", response_class=HTMLResponse)
async def google_callback(code: str = None, state: str = None, error: str = None):
    if error or not code or not state or state not in _oauth_states:
        return HTMLResponse(f"<script>window.close()</script><p>OAuth failed: {error or 'invalid'}</p>")
    uid = _oauth_states.pop(state)
    async with httpx.AsyncClient() as cli:
        r = await cli.post("https://oauth2.googleapis.com/token", data={
            "code": code, "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT, "grant_type": "authorization_code",
        })
    if r.status_code != 200:
        return HTMLResponse(f"<p>Token exchange failed: {r.text[:200]}</p>")
    tok = r.json()
    meta = {"access_token": tok.get("access_token"), "refresh_token": tok.get("refresh_token"),
            "scope": tok.get("scope"), "expires_in": tok.get("expires_in")}
    existing = sb.table("jarvis_plugins").select("*").eq("user_id", uid).eq("plugin_id", "google").execute()
    doc = {"user_id": uid, "plugin_id": "google", "plugin_name": "Google Workspace",
           "status": "connected", "connected_at": datetime.now(timezone.utc).isoformat(), "metadata": meta}
    if existing.data:
        sb.table("jarvis_plugins").update(doc).eq("user_id", uid).eq("plugin_id", "google").execute()
    else:
        doc["id"] = str(uuid.uuid4())
        sb.table("jarvis_plugins").insert(doc).execute()
    # also mark related plugins as connected (youtube, google_search use same token)
    for pid, pname in [("youtube", "YouTube"), ("google_search", "Google Search")]:
        ex = sb.table("jarvis_plugins").select("id").eq("user_id", uid).eq("plugin_id", pid).execute()
        d2 = {"user_id": uid, "plugin_id": pid, "plugin_name": pname, "status": "connected",
              "connected_at": datetime.now(timezone.utc).isoformat(), "metadata": {"linked_to": "google"}}
        if ex.data:
            sb.table("jarvis_plugins").update(d2).eq("user_id", uid).eq("plugin_id", pid).execute()
        else:
            d2["id"] = str(uuid.uuid4())
            sb.table("jarvis_plugins").insert(d2).execute()
    return HTMLResponse("<script>window.close()</script><p>Google connected. You can close this window.</p>")

@api_router.get("/auth/github/callback", response_class=HTMLResponse)
async def github_callback(code: str = None, state: str = None, error: str = None):
    if error or not code or not state or state not in _oauth_states:
        return HTMLResponse(f"<script>window.close()</script><p>OAuth failed: {error or 'invalid'}</p>")
    uid = _oauth_states.pop(state)
    client_id = os.environ.get('GITHUB_CLIENT_ID')
    client_secret = os.environ.get('GITHUB_CLIENT_SECRET')
    async with httpx.AsyncClient() as cli:
        r = await cli.post("https://github.com/login/oauth/access_token", 
            headers={"Accept": "application/json"},
            data={"code": code, "client_id": client_id, "client_secret": client_secret})
    if r.status_code != 200:
        return HTMLResponse(f"<p>Token exchange failed: {r.text[:200]}</p>")
    tok = r.json()
    if "error" in tok:
        return HTMLResponse(f"<p>GitHub Error: {tok.get('error_description')}</p>")
    
    meta = {"access_token": tok.get("access_token"), "scope": tok.get("scope")}
    sb.table("jarvis_plugins").upsert({
        "user_id": uid, "plugin_id": "github", "plugin_name": "GitHub",
        "status": "connected", "connected_at": datetime.now(timezone.utc).isoformat(), "metadata": meta
    }).execute()
    return HTMLResponse("<script>window.close()</script><p>GitHub connected. You can close this window.</p>")

# ============ MULTI-AGENT JOBS / STATE ============
class JobIn(BaseModel):
    project_id: str
    agent_type: str  # architect | backend | frontend | infra | security | refactor | ux | research | user_sim | orchestrator | memory | verification | qa_test | bug_hunter | performance | exploit | planner | coder | tester | reviewer
    payload: dict = {}

@api_router.get("/llm/providers")
async def llm_providers_status(user=Depends(get_current_user)):
    from llm_router import PROVIDERS, _cooldowns
    out = []
    for p in PROVIDERS:
        configured = bool(os.environ.get(p["key_env"]))
        cd = _cooldowns.get(p["name"], 0)
        out.append({"name": p["name"], "model": p["model"], "configured": configured,
                    "in_cooldown": cd > datetime.now(timezone.utc).timestamp(),
                    "roles": p["roles"]})
    return out

@api_router.post("/llm/test")
async def llm_test(payload: dict, user=Depends(get_current_user)):
    role = payload.get("role", "chat")
    msg = payload.get("message", "Say hi in one short sentence.")
    try:
        res = await router_call(role, "You are Jarvis.", msg, sb=sb)
        return res
    except Exception as e:
        raise HTTPException(500, str(e)[:300])

@api_router.get("/projects/{pid}/state")
async def get_project_state(pid: str, user=Depends(get_current_user)):
    proj = sb.table("jarvis_projects").select("id").eq("id", pid).eq("user_id", user["id"]).execute()
    if not proj.data: raise HTTPException(404, "Not found")
    st = sb.table("jarvis_project_state").select("*").eq("project_id", pid).execute()
    if not st.data:
        return {"project_id": pid, "current_phase": "planning", "completed_steps": [],
                "pending_steps": [], "decisions": [], "blockers": [], "last_summary": ""}
    return st.data[0]

@api_router.get("/projects/{pid}/jobs")
async def list_jobs(pid: str, user=Depends(get_current_user)):
    proj = sb.table("jarvis_projects").select("id").eq("id", pid).eq("user_id", user["id"]).execute()
    if not proj.data: raise HTTPException(404, "Not found")
    jobs = sb.table("jarvis_agent_jobs").select("*").eq("project_id", pid).order("created_at", desc=True).limit(50).execute().data
    return jobs

@api_router.post("/projects/{pid}/jobs")
async def enqueue_job(pid: str, payload: JobIn, user=Depends(get_current_user)):
    proj = sb.table("jarvis_projects").select("id").eq("id", pid).eq("user_id", user["id"]).execute()
    if not proj.data: raise HTTPException(404, "Not found")
    job = {"id": str(uuid.uuid4()), "project_id": pid, "agent_type": payload.agent_type,
           "status": "queued", "payload": payload.payload}
    sb.table("jarvis_agent_jobs").insert(job).execute()
    # Fire-and-forget worker
    asyncio.create_task(_run_job(job["id"]))
    return job

import asyncio
async def _run_job(job_id: str):
    j = sb.table("jarvis_agent_jobs").select("*").eq("id", job_id).single().execute().data
    if not j: return
    sb.table("jarvis_agent_jobs").update({"status": "processing", "started_at": datetime.now(timezone.utc).isoformat()}).eq("id", job_id).execute()
    try:
        proj = sb.table("jarvis_projects").select("*").eq("id", j["project_id"]).single().execute().data
        agent = j["agent_type"]
        
        # Determine system prompt and role based on agent type
        if agent == "planner":
            sysm = "You are the CEO/Planner. Output STRICT JSON {steps:[{id,title,description,depends_on,agent_type}]}."
            role = "planner"
        elif agent in ("coder", "backend", "frontend", "architect", "refactor"):
            sysm = f"You are the {agent.upper()} specialist. Output ONLY file content, no markdown fences. Production-ready code only."
            role = agent if agent != "coder" else "coder"
        elif agent == "security":
            sysm = "You are the SECURITY specialist. Audit the code and return JSON {vulnerabilities:[],recommendations:[]}."
            role = "security"
        elif agent == "infra":
            sysm = "You are the INFRA specialist. Handle deployment, Docker, and CI/CD. Output content for config files."
            role = "infra"
        elif agent == "ux":
            sysm = "You are the UX specialist. Define user flows and interaction logic. Output JSON {flows:[],components:[]}."
            role = "ux"
        elif agent in ("tester", "qa_test"):
            sysm = "You are the QA/TEST specialist. Output testing commands and scripts. JSON {tests:[]}."
            role = "qa_test"
        elif agent == "verification":
            sysm = "You are the VERIFICATION engine. Verify that the task meets all criteria. Return JSON {verified:bool,reason:str}."
            role = "verification"
        else:
            sysm = f"You are the {agent} specialist."
            role = agent

        # Execute based on agent type
        if agent == "planner":
            res = await router_call(role, sysm, f"Plan: {proj.get('description','')}", sb=sb)
            sb.table("jarvis_project_state").upsert({"project_id": j["project_id"], "current_phase": "coding",
                                                     "last_summary": res["content"][:500],
                                                     "updated_at": datetime.now(timezone.utc).isoformat()}).execute()
        elif agent in ("coder", "backend", "frontend", "architect", "refactor", "infra"):
            path = j["payload"].get("path", "README.md")
            purpose = j["payload"].get("purpose", "")
            res = await router_call(role, sysm, f"File: {path}\nPurpose: {purpose}\nProject: {proj.get('description','')}", sb=sb)
            content = res["content"].strip()
            if content.startswith("```"):
                lines = content.split("\n"); content = "\n".join(lines[1:-1] if lines[-1].strip().startswith("```") else lines[1:])
            existing = sb.table("jarvis_project_files").select("id").eq("project_id", j["project_id"]).eq("path", path).execute()
            if existing.data:
                sb.table("jarvis_project_files").update({"content": content, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("project_id", j["project_id"]).eq("path", path).execute()
            else:
                sb.table("jarvis_project_files").insert({"id": str(uuid.uuid4()), "project_id": j["project_id"], "path": path, "content": content, "language": "plaintext"}).execute()
            res["actions"] = [{"action": "processed", "path": path}]
        else:
            res = await router_call(role, sysm, j["payload"].get("instruction", f"Task for {agent}"), sb=sb)

        sb.table("jarvis_agent_jobs").update({"status": "done", "result": {"content": res["content"][:4000], "provider": res.get("provider")},
                                              "finished_at": datetime.now(timezone.utc).isoformat()}).eq("id", job_id).execute()
    except Exception as e:
        log.exception("job err")
        sb.table("jarvis_agent_jobs").update({"status": "failed", "error": str(e)[:400],
                                              "finished_at": datetime.now(timezone.utc).isoformat()}).eq("id", job_id).execute()

# ============ TELEGRAM PLUGIN ============
import random, string

def _gen_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@api_router.get("/plugins/telegram/link-code")
async def telegram_link_code(user=Depends(get_current_user)):
    code = _gen_code()
    # Save code to DB instead of memory to survive restarts
    meta = {"link_code": code, "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}
    existing = sb.table("jarvis_plugins").select("id").eq("user_id", user["id"]).eq("plugin_id", "telegram_linking").execute()
    if existing.data:
        sb.table("jarvis_plugins").update({"metadata": meta}).eq("user_id", user["id"]).eq("plugin_id", "telegram_linking").execute()
    else:
        sb.table("jarvis_plugins").insert({"id": str(uuid.uuid4()), "user_id": user["id"], "plugin_id": "telegram_linking", "plugin_name": "Telegram Linking", "metadata": meta}).execute()
    
    bot_username = TELEGRAM_BOT_USERNAME or "JarvisAgentBot"
    return {"code": code, "bot_username": bot_username}

@api_router.get("/plugins/telegram/status")
async def telegram_status(user=Depends(get_current_user)):
    row = sb.table("jarvis_plugins").select("*").eq("user_id", user["id"]).eq("plugin_id", "telegram").execute()
    if row.data and row.data[0].get("status") == "connected":
        return {"status": "connected"}
    return {"status": "pending"}

async def _tg_send(chat_id, text):
    if not TELEGRAM_BOT_TOKEN:
        return
    async with httpx.AsyncClient(timeout=10) as cli:
        try:
            r = await cli.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                               json={"chat_id": chat_id, "text": text})
            if r.status_code >= 400:
                log.error(f"TG send error: {r.text}")
        except Exception as e:
            log.exception("TG send failed")

@api_router.post("/telegram/webhook")
async def telegram_webhook(payload: dict):
    """Native Telegram webhook."""
    msg = payload.get("message") or payload.get("edited_message") or {}
    chat = msg.get("chat") or {}
    frm = msg.get("from") or {}
    chat_id = chat.get("id")
    tg_user_id = str(frm.get("id") or chat_id or "")
    tg_username = frm.get("username", "")
    text = (msg.get("text") or "").strip()
    
    if not chat_id or not text:
        return {"ok": True}

    try:
        # 1. Handle /start and deep-linking
        if text.lower().startswith("/start"):
            parts = text.split()
            if len(parts) > 1:
                # User clicked a link like t.me/bot?start=CODE
                candidate = parts[1].upper()
            else:
                await _tg_send(chat_id,
                    "Hi! I'm Jarvis. To link your account, open jarvisagent.app → Plugins → Telegram, "
                    "then send me the 6-character code shown there.")
                return {"ok": True}
        else:
            # 2. Handle direct code entry
            candidate = text.lstrip("/").upper()

        # Link-code processing
        if len(candidate) == 6 and candidate.isalnum() and candidate.isupper():
            # Search DB for this code in pending links
            all_pending = sb.table("jarvis_plugins").select("*").eq("plugin_id", "telegram_linking").execute().data
            uid = None
            for p in all_pending:
                meta = p.get("metadata") or {}
                if meta.get("link_code") == candidate:
                    uid = p["user_id"]
                    # Check expiry
                    exp = meta.get("expires_at")
                    if exp and datetime.fromisoformat(exp) < datetime.now(timezone.utc):
                        await _tg_send(chat_id, "❌ This code has expired. Please generate a new one in the app.")
                        return {"ok": True}
                    break
            
            if not uid:
                # If we were in /start CODE, maybe just give welcome
                if text.lower().startswith("/start"):
                    await _tg_send(chat_id, "Hi! I'm Jarvis. That link code seems invalid. Open the app to get a new one.")
                else:
                    await _tg_send(chat_id, "❌ Invalid or expired code. Generate a new one in the app.")
                return {"ok": True}

            # Success: link the account
            meta = {"telegram_user_id": tg_user_id, "telegram_chat_id": chat_id, "telegram_username": tg_username}
            sb.table("jarvis_plugins").upsert({
                "user_id": uid, "plugin_id": "telegram", "plugin_name": "Telegram",
                "status": "connected", "connected_at": datetime.now(timezone.utc).isoformat(), "metadata": meta
            }).execute()
            # Clean up linking entry
            sb.table("jarvis_plugins").delete().eq("user_id", uid).eq("plugin_id", "telegram_linking").execute()
            
            await _tg_send(chat_id, "✅ Linked! You can now chat with Jarvis here.")
            return {"ok": True}

        # 3. Normal chat path: find linked user
        rows = sb.table("jarvis_plugins").select("*").eq("plugin_id", "telegram").execute().data
        uid = None
        for row in rows:
            m = row.get("metadata") or {}
            if str(m.get("telegram_user_id", "")) == tg_user_id or str(m.get("telegram_chat_id", "")) == str(chat_id):
                uid = row["user_id"]; break
        
        if not uid:
            if not text.lower().startswith("/"): # Don't annoy on every unknown command
                await _tg_send(chat_id, "You're not linked yet. Open jarvisagent.app → Plugins → Telegram and send me the code.")
            return {"ok": True}

        # ... rest of the assistant logic ...

    # Reuse or create a Telegram chat session
    existing_sessions = sb.table("jarvis_chat_sessions").select("*").eq("user_id", uid).eq("assistant_id", "jarvis").order("updated_at", desc=True).limit(1).execute()
    if existing_sessions.data:
        sid = existing_sessions.data[0]["id"]
    else:
        sid = str(uuid.uuid4())
        sb.table("jarvis_chat_sessions").insert({"id": sid, "user_id": uid, "title": "Telegram", "assistant_id": "jarvis"}).execute()

    # Build system prompt with project context
    sysm = BUILDER_AWARE_SYSTEM
    try:
        custom = sb.table("jarvis_personas").select("*").eq("user_id", uid).eq("assistant_id", "jarvis").execute()
        if custom.data and custom.data[0].get("system_prompt"):
            sysm = custom.data[0]["system_prompt"] + "\n\n" + BUILDER_AWARE_SYSTEM
    except Exception: pass

    # Inject project context
    try:
        projects = sb.table("jarvis_projects").select("*").eq("user_id", uid).order("updated_at", desc=True).limit(5).execute().data
        if projects:
            project_ctx = "\n\nUSER'S CURRENT PROJECTS:\n" + "\n".join(_summarize_project(p) for p in projects)
            sysm += project_ctx
    except Exception: pass

    # Inject connected plugins
    try:
        plugs = sb.table("jarvis_plugins").select("*").eq("user_id", uid).eq("status", "connected").execute()
        if plugs.data:
            names = ", ".join(p["plugin_name"] for p in plugs.data)
            sysm += f"\n\nUser has these tools connected: {names}."
    except Exception: pass

    try:
        # Get last few messages for context
        prior = sb.table("jarvis_chat_messages").select("*").eq("session_id", sid).order("created_at").execute().data
        prior = prior[-10:]
        ctx = "".join(f"\n{'User' if m['role']=='user' else 'Assistant'}: {m['content']}" for m in prior)
        full = (ctx + f"\nUser: {text}").strip() if ctx else text
        
        res = await router_call("chat", sysm + "\n\nUser is messaging via Telegram. Keep replies relatively concise.", full, sb=sb)
        reply = res["content"]
    except Exception as e:
        log.exception("telegram chat err")
        reply = f"Sorry, I hit an error: {str(e)[:100]}"

    # Detect actions in response
    builder_action = None
    task_action = None
    
    if "BUILDER_ACTION:" in reply:
        parts = reply.split("BUILDER_ACTION:", 1)
        action_text = parts[1].strip().split("\n")[0].strip()
        
        # Try to find a project ID in the action text or use the most recent one
        target_pid = None
        try:
            projects = sb.table("jarvis_projects").select("id").eq("user_id", uid).order("updated_at", desc=True).limit(1).execute().data
            if projects: target_pid = projects[0]["id"]
        except Exception: pass
        
        if target_pid:
            # Enqueue a job for the builder
            job = {"id": str(uuid.uuid4()), "project_id": target_pid, "agent_type": "coder", 
                   "status": "queued", "payload": {"instruction": action_text, "source": "telegram_relay"}}
            sb.table("jarvis_agent_jobs").insert(job).execute()
            asyncio.create_task(_run_job(job["id"]))
            builder_action = {"description": action_text, "project_id": target_pid}

    if "TASK_ACTION:" in reply:
        parts = reply.split("TASK_ACTION:", 1)
        action_text = parts[1].strip().split("\n")[0].strip()
        task_action = {"description": action_text}
        # Enqueue task
        try:
            tid = str(uuid.uuid4())
            sb.table("jarvis_tasks").insert({"id": tid, "user_id": uid, "title": action_text, "status": "active"}).execute()
            asyncio.create_task(_run_task(tid))
        except Exception: pass

    sb.table("jarvis_chat_messages").insert({"id": str(uuid.uuid4()), "session_id": sid, "role": "user", "content": text, "assistant_id": "jarvis"}).execute()
    sb.table("jarvis_chat_messages").insert({
        "id": str(uuid.uuid4()), "session_id": sid, "role": "assistant", 
        "content": reply, "assistant_id": "jarvis",
        "metadata": {
            "builder_action": builder_action,
            "task_action": task_action
        } if (builder_action or task_action) else None
    }).execute()
    
    await _tg_send(chat_id, reply)
    return {"ok": True}

# ============ BILLING (CREDITS) ============
CREDIT_PRICES = {
    "1000": 10.0,
    "5000": 40.0,
    "10000": 70.0,
}

# Token pricing: 1 credit = 1000 tokens (approx)
# This is a rough mapping. In a real system, you might use different costs for input vs output.
TOKEN_TO_CREDIT_RATE = 0.001

# Cost per build: a flat fee in credits + token cost
BUILD_FLAT_FEE = 5.0

def _user_credits(uid: str) -> float:
    res = sb.table("jarvis_users").select("credits").eq("id", uid).execute()
    if res.data and res.data[0]:
        return float(res.data[0].get("credits", 0.0))
    return 0.0

def _update_credits(uid: str, amount: float, description: str = None):
    # Update balance
    res = sb.table("jarvis_users").select("credits").eq("id", uid).execute()
    current = float(res.data[0].get("credits", 0.0)) if res.data else 0.0
    new_balance = current + amount
    sb.table("jarvis_users").update({"credits": new_balance}).eq("id", uid).execute()

    # Log transaction
    sb.table("jarvis_credit_transactions").insert({
        "user_id": uid,
        "amount": amount,
        "type": "topup" if amount > 0 else "consumption",
        "description": description
    }).execute()
    return new_balance

def _check_credits(uid: str, required: float = 0.0):
    balance = _user_credits(uid)
    if balance < required:
        raise HTTPException(402, f"Insufficient credits. Current balance: {balance:.2f}. Please top up.")

def _consume_credits(uid: str, amount: float, description: str):
    _check_credits(uid, amount)
    _update_credits(uid, -amount, description)

@api_router.get("/billing/plan")
async def get_plan(user=Depends(get_current_user)):
    sub = _user_plan(user["id"])
    p = _period_key()
    usage_row = sb.table("jarvis_usage_counters").select("*").eq("user_id", user["id"]).eq("period", p).execute()
    usage = usage_row.data[0] if usage_row.data else {"builds_used": 0, "chat_messages_used": 0}
    return {"plan": sub.get("plan"), "status": sub.get("status"), "current_period_end": sub.get("current_period_end"),
            "limits": PLAN_LIMITS[sub.get("plan", "free")], "usage": {"builds_used": usage.get("builds_used", 0),
                                                                       "chat_messages_used": usage.get("chat_messages_used", 0)}}

class CreditTopupIn(BaseModel):
    amount_credits: str # "1000", "5000", "10000"

@api_router.post("/billing/topup")
async def topup_credits(payload: CreditTopupIn, user=Depends(get_current_user)):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(400, "Stripe not configured")

    credits = payload.amount_credits
    if credits not in CREDIT_PRICES:
        raise HTTPException(400, "Invalid credit amount")

    price_euro = CREDIT_PRICES[credits]

    try:
        sub = sb.table("jarvis_subscriptions").select("*").eq("user_id", user["id"]).execute()
        customer_id = sub.data[0].get("stripe_customer_id") if sub.data else None
        if not customer_id:
            cust = stripe.Customer.create(email=user["email"], name=user["name"], metadata={"user_id": user["id"]})
            customer_id = cust.id
            sb.table("jarvis_subscriptions").upsert({"user_id": user["id"], "stripe_customer_id": customer_id, "plan": "free"}).execute()

        # Create a one-time payment session for the top-up
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": f"{credits} Jarvis Credits"},
                    "unit_amount": int(price_euro * 100),
                },
                "quantity": 1,
            }],
            success_url=f"{APP_PUBLIC_URL}/app?topup=true",
            cancel_url=f"{APP_PUBLIC_URL}/pricing",
            metadata={"user_id": user["id"], "credits": credits},
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(500, str(e)[:300])

@api_router.post("/billing/portal")
async def portal(user=Depends(get_current_user)):
    if not STRIPE_SECRET_KEY: raise HTTPException(400, "Stripe not configured")
    sub = sb.table("jarvis_subscriptions").select("*").eq("user_id", user["id"]).execute()
    if not sub.data or not sub.data[0].get("stripe_customer_id"):
        raise HTTPException(400, "No subscription")
    s = stripe.billing_portal.Session.create(customer=sub.data[0]["stripe_customer_id"], return_url=f"{APP_PUBLIC_URL}/app")
    return {"url": s.url}

from fastapi import Request

@api_router.post("/billing/webhook")
async def webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET: return {"ok": True, "skipped": True}
    payload_b = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        evt = stripe.Webhook.construct_event(payload_b, sig, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(400, f"Bad signature: {str(e)[:120]}")
    t = evt["type"]
    obj = evt["data"]["object"]
    if t == "checkout.session.completed":
        meta = obj.get("metadata", {}) or {}
        uid = meta.get("user_id"); plan = meta.get("plan", "starter")
        sub_id = obj.get("subscription")
        if uid and sub_id:
            sub = stripe.Subscription.retrieve(sub_id)
            sb.table("jarvis_subscriptions").upsert({
                "user_id": uid, "stripe_customer_id": obj.get("customer"),
                "stripe_subscription_id": sub_id, "plan": plan, "status": sub["status"],
                "current_period_end": datetime.fromtimestamp(sub["current_period_end"], tz=timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
    elif t in ("customer.subscription.updated", "customer.subscription.deleted"):
        cust = obj.get("customer")
        row = sb.table("jarvis_subscriptions").select("*").eq("stripe_customer_id", cust).execute()
        if row.data:
            uid = row.data[0]["user_id"]
            new_plan = "free" if t == "customer.subscription.deleted" else row.data[0].get("plan", "starter")
            sb.table("jarvis_subscriptions").update({
                "plan": new_plan, "status": obj.get("status", "canceled"),
                "current_period_end": datetime.fromtimestamp(obj["current_period_end"], tz=timezone.utc).isoformat() if obj.get("current_period_end") else None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("user_id", uid).execute()
    return {"ok": True}

@api_router.get("/projects/{pid}/download-zip")
async def download_project_zip(pid: str, user=Depends(get_current_user)):
    proj = sb.table("jarvis_projects").select("id").eq("id", pid).eq("user_id", user["id"]).execute()
    if not proj.data: raise HTTPException(404, "Not found")
    files = sb.table("jarvis_project_files").select("*").eq("project_id", pid).execute().data
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for f in files:
            zip_file.writestr(f["path"], f["content"])
    
    zip_buffer.seek(0)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        zip_buffer,
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": f"attachment; filename=project-{pid[:8]}.zip"}
    )

# ============ PERSONAS (custom system prompts) ============
class PersonaIn(BaseModel):
    assistant_id: str
    system_prompt: str
    custom_name: Optional[str] = None

@api_router.get("/personas")
async def list_personas(user=Depends(get_current_user)):
    rows = sb.table("jarvis_personas").select("*").eq("user_id", user["id"]).execute().data
    by_aid = {r["assistant_id"]: r for r in rows}
    out = []
    for aid, default in ASSISTANT_PERSONAS.items():
        ex = by_aid.get(aid)
        out.append({
            "assistant_id": aid,
            "default_prompt": default,
            "system_prompt": ex["system_prompt"] if ex else "",
            "custom_name": ex.get("custom_name") if ex else None,
            "is_custom": bool(ex and ex.get("system_prompt")),
        })
    return out

@api_router.put("/personas")
async def update_persona(payload: PersonaIn, user=Depends(get_current_user)):
    if payload.assistant_id not in ASSISTANT_PERSONAS:
        raise HTTPException(400, "Invalid assistant_id")
    doc = {"user_id": user["id"], "assistant_id": payload.assistant_id,
           "system_prompt": payload.system_prompt, "custom_name": payload.custom_name,
           "updated_at": datetime.now(timezone.utc).isoformat()}
    existing = sb.table("jarvis_personas").select("id").eq("user_id", user["id"]).eq("assistant_id", payload.assistant_id).execute()
    if existing.data:
        sb.table("jarvis_personas").update(doc).eq("user_id", user["id"]).eq("assistant_id", payload.assistant_id).execute()
    else:
        doc["id"] = str(uuid.uuid4())
        sb.table("jarvis_personas").insert(doc).execute()
    return {"ok": True}

@api_router.delete("/personas/{assistant_id}")
async def reset_persona(assistant_id: str, user=Depends(get_current_user)):
    sb.table("jarvis_personas").delete().eq("user_id", user["id"]).eq("assistant_id", assistant_id).execute()
    return {"ok": True}

# ============ APP ============
app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
