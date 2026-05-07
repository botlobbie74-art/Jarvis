"""LLM Router with multi-provider rotation, role-based selection, and quota fallback."""
import os, time, asyncio, logging
from typing import Optional, List, Dict
import httpx

log = logging.getLogger("jarvis.router")

# Provider config: (provider, model, role_priority dict)
PROVIDERS = [
    {"name": "gemini", "key_env": "GEMINI_API_KEY", "model": "gemini-2.5-flash",
     "endpoint": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
     "roles": {"planner": 90, "coder": 75, "chat": 85, "tester": 80, "reviewer": 85}},
    {"name": "cerebras", "key_env": "CEREBRAS_API_KEY", "model": "llama-3.3-70b",
     "endpoint": "https://api.cerebras.ai/v1/chat/completions",
     "roles": {"planner": 80, "coder": 90, "chat": 95, "tester": 85, "reviewer": 80}},
    {"name": "groq", "key_env": "GROQ_API_KEY", "model": "llama-3.3-70b-versatile",
     "endpoint": "https://api.groq.com/openai/v1/chat/completions",
     "roles": {"planner": 75, "coder": 85, "chat": 90, "tester": 80, "reviewer": 75}},
    {"name": "mistral", "key_env": "MISTRAL_API_KEY", "model": "codestral-latest",
     "endpoint": "https://api.mistral.ai/v1/chat/completions",
     "roles": {"planner": 60, "coder": 95, "chat": 65, "tester": 70, "reviewer": 70}},
    {"name": "cohere", "key_env": "COHERE_API_KEY", "model": "command-r-plus",
     "endpoint": "https://api.cohere.com/v2/chat",
     "roles": {"planner": 75, "coder": 60, "chat": 80, "tester": 70, "reviewer": 85}},
    {"name": "together", "key_env": "TOGETHER_API_KEY", "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
     "endpoint": "https://api.together.xyz/v1/chat/completions",
     "roles": {"planner": 70, "coder": 75, "chat": 75, "tester": 70, "reviewer": 70}},
    {"name": "openrouter", "key_env": "OPENROUTER_API_KEY", "model": "deepseek/deepseek-chat-v3.1:free",
     "endpoint": "https://openrouter.ai/api/v1/chat/completions",
     "roles": {"planner": 65, "coder": 80, "chat": 70, "tester": 65, "reviewer": 65}},
]

# In-memory cooldown state {provider_name: cooldown_until_ts}
_cooldowns: Dict[str, float] = {}
COOLDOWN_SECONDS = 60


def _available(p):
    return os.environ.get(p["key_env"]) and _cooldowns.get(p["name"], 0) < time.time()


def _pick_providers(role: str) -> List[dict]:
    """Sort available providers by role-fit score desc."""
    avail = [p for p in PROVIDERS if _available(p)]
    return sorted(avail, key=lambda p: p["roles"].get(role, 50), reverse=True)


async def _call_openai_compat(p, system, user, endpoint=None, extra_headers=None):
    headers = {"Authorization": f"Bearer {os.environ[p['key_env']]}", "Content-Type": "application/json"}
    if extra_headers: headers.update(extra_headers)
    payload = {
        "model": p["model"],
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.4,
    }
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(endpoint or p["endpoint"], headers=headers, json=payload)
    if r.status_code == 429 or r.status_code >= 500:
        raise QuotaError(f"{p['name']} {r.status_code}: {r.text[:120]}")
    if r.status_code >= 400:
        raise RuntimeError(f"{p['name']} {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["choices"][0]["message"]["content"]


async def _call_gemini(p, system, user):
    key = os.environ[p["key_env"]]
    url = f"{p['endpoint']}?key={key}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": f"{system}\n\n{user}"}]}],
        "generationConfig": {"temperature": 0.4},
    }
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(url, json=payload)
    if r.status_code == 429:
        raise QuotaError(f"gemini quota: {r.text[:120]}")
    if r.status_code >= 400:
        raise RuntimeError(f"gemini {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


async def _call_cohere(p, system, user):
    headers = {"Authorization": f"Bearer {os.environ[p['key_env']]}", "Content-Type": "application/json"}
    payload = {"model": p["model"],
               "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
               "temperature": 0.4}
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(p["endpoint"], headers=headers, json=payload)
    if r.status_code == 429: raise QuotaError(f"cohere quota: {r.text[:120]}")
    if r.status_code >= 400: raise RuntimeError(f"cohere {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["message"]["content"][0]["text"]


class QuotaError(Exception): ...


async def llm_call(role: str, system: str, user: str, sb=None) -> dict:
    """Try providers ordered by role-fit. Falls back on 429/5xx. Logs to Supabase."""
    candidates = _pick_providers(role)
    if not candidates:
        raise RuntimeError("No LLM provider available (all in cooldown or no keys)")
    last_err = None
    for p in candidates:
        t0 = time.time()
        try:
            if p["name"] == "gemini":
                content = await _call_gemini(p, system, user)
            elif p["name"] == "cohere":
                content = await _call_cohere(p, system, user)
            elif p["name"] == "openrouter":
                content = await _call_openai_compat(p, system, user, extra_headers={"HTTP-Referer": "https://jarvisagent.vercel.app", "X-Title": "Jarvis"})
            else:
                content = await _call_openai_compat(p, system, user)
            latency = int((time.time() - t0) * 1000)
            if sb:
                try:
                    sb.table("jarvis_llm_calls").insert({"provider": p["name"], "model": p["model"], "role": role,
                                                         "status": "success", "latency_ms": latency}).execute()
                except Exception: pass
            return {"content": content, "provider": p["name"], "model": p["model"], "latency_ms": latency}
        except QuotaError as e:
            _cooldowns[p["name"]] = time.time() + COOLDOWN_SECONDS
            last_err = e
            log.warning("Quota %s, fallback. %s", p["name"], e)
            if sb:
                try: sb.table("jarvis_llm_calls").insert({"provider": p["name"], "model": p["model"], "role": role, "status": "quota", "error": str(e)[:300]}).execute()
                except Exception: pass
            continue
        except Exception as e:
            last_err = e
            log.warning("Err %s, fallback. %s", p["name"], e)
            if sb:
                try: sb.table("jarvis_llm_calls").insert({"provider": p["name"], "model": p["model"], "role": role, "status": "error", "error": str(e)[:300]}).execute()
                except Exception: pass
            continue
    raise RuntimeError(f"All providers failed. Last: {last_err}")
