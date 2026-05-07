from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALG = 'HS256'
JWT_EXP_DAYS = 7
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Wingman API")
api_router = APIRouter(prefix="/api")


# ============ MODELS ============
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ChatMessageIn(BaseModel):
    session_id: str
    message: str
    assistant_id: str = "jarvis"  # jarvis, judy, alfred, venus, donna

class ChatMessageOut(BaseModel):
    id: str
    session_id: str
    role: str  # user / assistant
    content: str
    assistant_id: str
    created_at: datetime

class ChatSession(BaseModel):
    id: str
    user_id: str
    title: str
    assistant_id: str
    created_at: datetime
    updated_at: datetime

class PluginConnection(BaseModel):
    id: str
    user_id: str
    plugin_id: str  # google, github, discord, whatsapp, etc.
    plugin_name: str
    status: str  # connected / disconnected / pending
    connected_at: Optional[datetime] = None
    metadata: dict = {}

class PluginToggleIn(BaseModel):
    plugin_id: str
    plugin_name: str
    action: str  # connect / disconnect


# ============ HELPERS ============
def hash_password(p: str) -> str:
    return pwd_context.hash(p)

def verify_password(p: str, hashed: str) -> bool:
    return pwd_context.verify(p, hashed)

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============ AUTH ROUTES ============
@api_router.get("/")
async def root():
    return {"message": "Wingman API running"}

@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(payload: UserSignup):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": payload.email.lower(),
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user_id, email=user_doc["email"], name=user_doc["name"], created_at=user_doc["created_at"])
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])


# ============ CHAT ROUTES ============
ASSISTANT_PERSONAS = {
    "jarvis": "You are Jarvis, a Tech co-founder AI assistant. You review code, architect systems, and ship features. Be concise, technical, and direct. Use markdown when helpful.",
    "judy": "You are Judy, a Sales lead AI assistant. You track pipelines, prep pitches, and follow up. Be friendly, persuasive, and goal-driven.",
    "alfred": "You are Alfred, an Executive assistant AI. You manage calendars, draft emails, and ensure nothing slips. Be polite, organized, and meticulous.",
    "venus": "You are Venus, a Content marketer AI. You write posts, plan content calendars, and keep brand voice sharp. Be creative, on-brand, and engaging.",
    "donna": "You are Donna, a Personal assistant AI. You sort the day, handle to-dos, and remember details. Be warm, efficient, and proactive.",
}

@api_router.get("/chat/sessions", response_model=List[ChatSession])
async def list_sessions(user=Depends(get_current_user)):
    docs = await db.chat_sessions.find({"user_id": user["id"]}).sort("updated_at", -1).to_list(100)
    return [ChatSession(**d) for d in docs]

@api_router.post("/chat/sessions", response_model=ChatSession)
async def create_session(assistant_id: str = "jarvis", user=Depends(get_current_user)):
    if assistant_id not in ASSISTANT_PERSONAS:
        assistant_id = "jarvis"
    now = datetime.now(timezone.utc)
    session = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": "New chat",
        "assistant_id": assistant_id,
        "created_at": now,
        "updated_at": now,
    }
    await db.chat_sessions.insert_one(session)
    return ChatSession(**session)

@api_router.get("/chat/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
async def get_session_messages(session_id: str, user=Depends(get_current_user)):
    sess = await db.chat_sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    msgs = await db.chat_messages.find({"session_id": session_id}).sort("created_at", 1).to_list(1000)
    return [ChatMessageOut(**m) for m in msgs]

@api_router.delete("/chat/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    res = await db.chat_sessions.delete_one({"id": session_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.chat_messages.delete_many({"session_id": session_id})
    return {"ok": True}

@api_router.post("/chat/send", response_model=ChatMessageOut)
async def send_message(payload: ChatMessageIn, user=Depends(get_current_user)):
    sess = await db.chat_sessions.find_one({"id": payload.session_id, "user_id": user["id"]})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    assistant_id = payload.assistant_id if payload.assistant_id in ASSISTANT_PERSONAS else "jarvis"

    # Save user message
    user_msg = {
        "id": str(uuid.uuid4()),
        "session_id": payload.session_id,
        "role": "user",
        "content": payload.message,
        "assistant_id": assistant_id,
        "created_at": datetime.now(timezone.utc),
    }
    await db.chat_messages.insert_one(user_msg)

    # Build LLM chat with history
    system_msg = ASSISTANT_PERSONAS[assistant_id]
    # Add plugin awareness
    connected_plugins = await db.plugins.find({"user_id": user["id"], "status": "connected"}).to_list(50)
    if connected_plugins:
        names = ", ".join(p["plugin_name"] for p in connected_plugins)
        system_msg += f"\n\nThe user has these tools connected: {names}. Mention them naturally if relevant."

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=payload.session_id,
            system_message=system_msg,
        ).with_model("gemini", "gemini-2.5-pro")

        # Replay history into chat (the library tracks per-session in memory only,
        # so we provide the latest message; LlmChat will use its own internal session)
        # We'll just send the new message - prior messages persisted in DB but for fresh
        # context we include last few in the message itself for continuity.
        prior = await db.chat_messages.find({"session_id": payload.session_id}).sort("created_at", 1).to_list(50)
        # exclude the just-inserted user msg
        prior = [p for p in prior if p["id"] != user_msg["id"]]
        history_text = ""
        for m in prior[-10:]:
            role = "User" if m["role"] == "user" else "Assistant"
            history_text += f"\n{role}: {m['content']}"
        full_text = (history_text + f"\nUser: {payload.message}").strip() if history_text else payload.message

        reply_text = await chat.send_message(UserMessage(text=full_text))
    except Exception as e:
        logging.exception("LLM error")
        reply_text = f"(LLM error: {str(e)[:200]})"

    asst_msg = {
        "id": str(uuid.uuid4()),
        "session_id": payload.session_id,
        "role": "assistant",
        "content": reply_text,
        "assistant_id": assistant_id,
        "created_at": datetime.now(timezone.utc),
    }
    await db.chat_messages.insert_one(asst_msg)

    # Update session title and updated_at
    title = sess.get("title") or "New chat"
    if title == "New chat":
        title = payload.message[:60]
    await db.chat_sessions.update_one(
        {"id": payload.session_id},
        {"$set": {"updated_at": datetime.now(timezone.utc), "title": title, "assistant_id": assistant_id}},
    )

    return ChatMessageOut(**asst_msg)


# ============ PLUGINS ROUTES ============
DEFAULT_PLUGINS = [
    {"id": "google", "name": "Google Workspace", "description": "Sheets, Docs, Calendar, Drive", "category": "productivity"},
    {"id": "google_search", "name": "Google Search", "description": "Search the web", "category": "search"},
    {"id": "youtube", "name": "YouTube", "description": "Search and manage videos", "category": "media"},
    {"id": "github", "name": "GitHub", "description": "Repos, issues, pull requests", "category": "developer"},
    {"id": "discord", "name": "Discord", "description": "Send and read messages", "category": "communication"},
    {"id": "whatsapp", "name": "WhatsApp", "description": "Background messaging", "category": "communication"},
]

@api_router.get("/plugins")
async def list_plugins(user=Depends(get_current_user)):
    user_plugins = await db.plugins.find({"user_id": user["id"]}).to_list(100)
    by_id = {p["plugin_id"]: p for p in user_plugins}
    result = []
    for p in DEFAULT_PLUGINS:
        existing = by_id.get(p["id"])
        result.append({
            **p,
            "status": existing["status"] if existing else "disconnected",
            "connected_at": existing.get("connected_at") if existing else None,
        })
    return result

@api_router.post("/plugins/toggle")
async def toggle_plugin(payload: PluginToggleIn, user=Depends(get_current_user)):
    if payload.action == "connect":
        existing = await db.plugins.find_one({"user_id": user["id"], "plugin_id": payload.plugin_id})
        doc = {
            "id": existing["id"] if existing else str(uuid.uuid4()),
            "user_id": user["id"],
            "plugin_id": payload.plugin_id,
            "plugin_name": payload.plugin_name,
            "status": "connected",
            "connected_at": datetime.now(timezone.utc),
            "metadata": {"mock": True},
        }
        await db.plugins.update_one(
            {"user_id": user["id"], "plugin_id": payload.plugin_id},
            {"$set": doc},
            upsert=True,
        )
        return {"status": "connected", "plugin_id": payload.plugin_id}
    else:
        await db.plugins.update_one(
            {"user_id": user["id"], "plugin_id": payload.plugin_id},
            {"$set": {"status": "disconnected"}},
        )
        return {"status": "disconnected", "plugin_id": payload.plugin_id}


# ============ TASKS ROUTES (background tasks Wingman runs) ============
class TaskIn(BaseModel):
    title: str
    schedule: Optional[str] = None  # e.g., "daily 8am"
    plugins: List[str] = []

@api_router.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    docs = await db.tasks.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    for d in docs:
        d.pop("_id", None)
    return docs

@api_router.post("/tasks")
async def create_task(payload: TaskIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": payload.title,
        "schedule": payload.schedule,
        "plugins": payload.plugins,
        "status": "active",
        "created_at": datetime.now(timezone.utc),
    }
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    await db.tasks.delete_one({"id": task_id, "user_id": user["id"]})
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
