from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os, logging, uuid, json, asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from supabase import create_client, Client
from github import Github, GithubException
from llm_router import llm_call as router_call

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALG = 'HS256'
JWT_EXP_DAYS = 7
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')  # legacy, not used anymore
WA_SERVICE_URL = os.environ.get('WA_SERVICE_URL', 'http://localhost:8002')
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
async def root(): return {"message": "Jarvis API running"}

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

# ============ CHAT ============
ASSISTANT_PERSONAS = {
    "jarvis": "You are Jarvis, a Tech co-founder AI assistant. You review code, architect systems, and ship features. Be concise, technical, and direct.",
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

@api_router.post("/chat/send")
async def send_message(payload: ChatMessageIn, user=Depends(get_current_user)):
    sess = sb.table("jarvis_chat_sessions").select("*").eq("id", payload.session_id).eq("user_id", user["id"]).limit(1).execute()
    if not sess.data: raise HTTPException(404, "Session not found")
    aid = payload.assistant_id if payload.assistant_id in ASSISTANT_PERSONAS else "jarvis"
    user_msg = {"id": str(uuid.uuid4()), "session_id": payload.session_id, "role": "user",
                "content": payload.message, "assistant_id": aid}
    sb.table("jarvis_chat_messages").insert(user_msg).execute()

    sysm = ASSISTANT_PERSONAS[aid]
    plugs = sb.table("jarvis_plugins").select("*").eq("user_id", user["id"]).eq("status", "connected").execute()
    if plugs.data:
        names = ", ".join(p["plugin_name"] for p in plugs.data)
        sysm += f"\n\nUser has these tools connected: {names}."
    try:
        sysm = sysm
        prior = sb.table("jarvis_chat_messages").select("*").eq("session_id", payload.session_id).order("created_at").execute().data
        prior = [p for p in prior if p["id"] != user_msg["id"]][-10:]
        ctx = "".join(f"\n{'User' if m['role']=='user' else 'Assistant'}: {m['content']}" for m in prior)
        full = (ctx + f"\nUser: {payload.message}").strip() if ctx else payload.message
        res = await router_call("chat", sysm, full, sb=sb)
        reply = res["content"]
    except Exception as e:
        log.exception("LLM err"); reply = f"(LLM error: {str(e)[:200]})"
    asst = {"id": str(uuid.uuid4()), "session_id": payload.session_id, "role": "assistant",
            "content": reply, "assistant_id": aid}
    sb.table("jarvis_chat_messages").insert(asst).execute()
    title = sess.data[0].get("title") or "New chat"
    if title == "New chat": title = payload.message[:60]
    sb.table("jarvis_chat_sessions").update({"updated_at": datetime.now(timezone.utc).isoformat(), "title": title, "assistant_id": aid}).eq("id", payload.session_id).execute()
    return sb.table("jarvis_chat_messages").select("*").eq("id", asst["id"]).single().execute().data

# ============ PLUGINS ============
DEFAULT_PLUGINS = [
    {"id": "google", "name": "Google Workspace", "description": "Sheets, Docs, Calendar, Drive", "category": "productivity"},
    {"id": "google_search", "name": "Google Search", "description": "Search the web", "category": "search"},
    {"id": "youtube", "name": "YouTube", "description": "Search and manage videos", "category": "media"},
    {"id": "github", "name": "GitHub", "description": "Repos, issues, pull requests", "category": "developer"},
    {"id": "whatsapp", "name": "WhatsApp", "description": "Background messaging", "category": "communication"},
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
@api_router.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    return sb.table("jarvis_tasks").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute().data

@api_router.post("/tasks")
async def create_task(payload: TaskIn, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "title": payload.title,
           "schedule": payload.schedule, "plugins": payload.plugins, "status": "active"}
    sb.table("jarvis_tasks").insert(doc).execute()
    return sb.table("jarvis_tasks").select("*").eq("id", doc["id"]).single().execute().data

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    sb.table("jarvis_tasks").delete().eq("id", task_id).eq("user_id", user["id"]).execute()
    return {"ok": True}

# ============ CODE AGENT (IDE) ============
PLAN_SYSTEM = """You are Jarvis, an autonomous senior software architect. Given a brief description of an app the user wants, produce a SUPER DETAILED implementation plan.

Return STRICT JSON ONLY (no prose, no code fences) with this exact shape:
{
  "name": "short kebab-case project name",
  "summary": "1-2 line product summary",
  "tech_stack": {"frontend": "...", "backend": "...", "database": "Supabase Postgres"},
  "supabase_tables": [{"name": "...", "columns": [{"name":"...","type":"...","notes":"..."}]}],
  "steps": [
    {"id": 1, "title": "...", "description": "what to do", "files": ["paths"]}
  ],
  "files_to_generate": [
    {"path": "frontend/src/App.jsx", "purpose": "..."},
    {"path": "backend/server.py", "purpose": "..."}
  ]
}

Be exhaustive in steps (8-15 steps). Every app uses React+Tailwind frontend and FastAPI+Supabase backend."""

CODE_SYSTEM = """You are Jarvis, an autonomous senior full-stack engineer. Given a project plan and a target file path, output ONLY the file content (no markdown fences, no commentary). Production-ready code, complete and runnable."""

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

@api_router.post("/projects/{pid}/build")
async def build_project(pid: str, user=Depends(get_current_user)):
    proj = sb.table("jarvis_projects").select("*").eq("id", pid).eq("user_id", user["id"]).single().execute().data
    if not proj: raise HTTPException(404, "Not found")
    plan = proj["plan"] or {}
    files_to_gen = plan.get("files_to_generate", [])[:12]  # cap to keep within latency
    sb.table("jarvis_projects").update({"status": "building"}).eq("id", pid).execute()
    generated = []
    for f in files_to_gen:
        path = f.get("path") or "untitled.txt"
        purpose = f.get("purpose", "")
        try:
            prompt = f"Project plan:\n{json.dumps(plan, indent=2)[:4000]}\n\nGenerate the COMPLETE content of file: {path}\nPurpose: {purpose}\nReturn ONLY the file content, no markdown fences."
            res = await router_call("coder", CODE_SYSTEM, prompt, sb=sb)
            content = res["content"].strip()
            if content.startswith("```"):
                # strip code fence
                lines = content.split("\n")
                content = "\n".join(lines[1:-1] if lines[-1].strip().startswith("```") else lines[1:])
            lang = "javascript" if path.endswith((".js", ".jsx")) else "typescript" if path.endswith((".ts", ".tsx")) else "python" if path.endswith(".py") else "json" if path.endswith(".json") else "css" if path.endswith(".css") else "html" if path.endswith(".html") else "sql" if path.endswith(".sql") else "plaintext"
            row = {"id": str(uuid.uuid4()), "project_id": pid, "path": path, "content": content, "language": lang}
            existing = sb.table("jarvis_project_files").select("id").eq("project_id", pid).eq("path", path).execute()
            if existing.data:
                sb.table("jarvis_project_files").update({"content": content, "language": lang, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("project_id", pid).eq("path", path).execute()
            else:
                sb.table("jarvis_project_files").insert(row).execute()
            generated.append(path)
        except Exception as e:
            log.exception("file gen err %s", path)
    sb.table("jarvis_projects").update({"status": "ready", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", pid).execute()
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

# ============ MULTI-AGENT JOBS / STATE ============
class JobIn(BaseModel):
    project_id: str
    agent_type: str  # planner | coder | tester | reviewer
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
        if agent == "planner":
            sysm = "You are the Planner sub-agent. Output STRICT JSON {steps:[{id,title,description,depends_on}]}."
            res = await router_call("planner", sysm, f"Plan: {proj.get('description','')}", sb=sb)
            sb.table("jarvis_project_state").upsert({"project_id": j["project_id"], "current_phase": "coding",
                                                     "last_summary": res["content"][:500],
                                                     "updated_at": datetime.now(timezone.utc).isoformat()}).execute()
        elif agent == "coder":
            path = j["payload"].get("path", "README.md")
            purpose = j["payload"].get("purpose", "")
            sysm = "You are the Coder sub-agent. Output ONLY file content, no markdown fences."
            res = await router_call("coder", sysm, f"File: {path}\nPurpose: {purpose}\nProject: {proj.get('description','')}", sb=sb)
            content = res["content"].strip()
            if content.startswith("```"):
                lines = content.split("\n"); content = "\n".join(lines[1:-1] if lines[-1].strip().startswith("```") else lines[1:])
            existing = sb.table("jarvis_project_files").select("id").eq("project_id", j["project_id"]).eq("path", path).execute()
            if existing.data:
                sb.table("jarvis_project_files").update({"content": content, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("project_id", j["project_id"]).eq("path", path).execute()
            else:
                sb.table("jarvis_project_files").insert({"id": str(uuid.uuid4()), "project_id": j["project_id"], "path": path, "content": content, "language": "plaintext"}).execute()
        elif agent == "tester":
            sysm = "You are the Tester sub-agent. Output curl/playwright commands as JSON {tests:[...]}."
            res = await router_call("tester", sysm, j["payload"].get("instruction", "test all routes"), sb=sb)
        elif agent == "reviewer":
            sysm = "You are the Reviewer sub-agent. Review and critique. Return JSON {issues:[],suggestions:[]}."
            res = await router_call("reviewer", sysm, j["payload"].get("instruction", "review project"), sb=sb)
        else:
            res = {"content": "unknown agent"}
        sb.table("jarvis_agent_jobs").update({"status": "done", "result": {"content": res["content"][:4000], "provider": res.get("provider")},
                                              "finished_at": datetime.now(timezone.utc).isoformat()}).eq("id", job_id).execute()
    except Exception as e:
        log.exception("job err")
        sb.table("jarvis_agent_jobs").update({"status": "failed", "error": str(e)[:400],
                                              "finished_at": datetime.now(timezone.utc).isoformat()}).eq("id", job_id).execute()

# ============ WHATSAPP PROXY ============
class WhatsAppSendIn(BaseModel):
    to: str
    message: str

@api_router.post("/whatsapp/start")
async def wa_start(user=Depends(get_current_user)):
    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.post(f"{WA_SERVICE_URL}/wa/start", json={"user_id": user["id"]})
    if r.status_code >= 400:
        raise HTTPException(500, f"WA service error: {r.text[:200]}")
    return r.json()

@api_router.get("/whatsapp/status")
async def wa_status(user=Depends(get_current_user)):
    async with httpx.AsyncClient(timeout=10) as cli:
        r = await cli.get(f"{WA_SERVICE_URL}/wa/status/{user['id']}")
    if r.status_code >= 400:
        return {"status": "error", "qr": None}
    return r.json()

@api_router.post("/whatsapp/send")
async def wa_send(payload: WhatsAppSendIn, user=Depends(get_current_user)):
    async with httpx.AsyncClient(timeout=15) as cli:
        r = await cli.post(f"{WA_SERVICE_URL}/wa/send", json={"user_id": user["id"], "to": payload.to, "message": payload.message})
    if r.status_code >= 400:
        raise HTTPException(400, r.text[:200])
    return r.json()

@api_router.post("/whatsapp/logout")
async def wa_logout(user=Depends(get_current_user)):
    async with httpx.AsyncClient(timeout=10) as cli:
        await cli.post(f"{WA_SERVICE_URL}/wa/logout", json={"user_id": user["id"]})
    return {"ok": True}

# ============ APP ============
app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
