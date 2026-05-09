"""LLM Router with fixed role-to-model mapping."""
import os, time, logging
from typing import Optional, Dict
import httpx

log = logging.getLogger("jarvis.router")

# Hard-coded agent to provider/model mapping
# Structure: {role: {"provider": name, "model": model_name}}
AGENT_MODEL_MAP = {
    "ceo": {"provider": "gemini", "model": "gemini-2.5-flash"},
    "planner": {"provider": "gemini", "model": "gemini-2.5-flash"},
    "architect": {"provider": "cerebras", "model": "llama-3.3-70b"},
    "backend": {"provider": "mistral", "model": "codestral-latest"},
    "frontend": {"provider": "ollama", "model": "gemma4:31b-cloud"},
    "infra": {"provider": "cerebras", "model": "llama-3.3-70b"},
    "security": {"provider": "mistral", "model": "codestral-latest"},
    "refactor": {"provider": "mistral", "model": "codestral-latest"},
    "ux": {"provider": "cohere", "model": "command-r-plus"},
    "research": {"provider": "cohere", "model": "command-r-plus"},
    "deep_research": {"provider": "gemini", "model": "gemini-2.5-flash"},
    "user_sim": {"provider": "cerebras", "model": "llama-3.3-70b"},
    "orchestrator": {"provider": "gemini", "model": "gemini-2.5-flash"},
    "memory": {"provider": "gemini", "model": "gemini-2.5-flash"},
    "verification": {"provider": "gemini", "model": "gemini-2.5-flash"},
    "qa_test": {"provider": "ollama", "model": "gemma4:31b-cloud"},
    "bug_hunter": {"provider": "mistral", "model": "codestral-latest"},
    "performance": {"provider": "cerebras", "model": "llama-3.3-70b"},
    "exploit": {"provider": "mistral", "model": "codestral-latest"},
    "chat": {"provider": "gemini", "model": "gemini-2.5-flash"},
    "coder": {"provider": "mistral", "model": "codestral-latest"},
}

PROVIDERS = [
    {"name": "gemini", "key_env": "GEMINI_API_KEY", "model": "gemini-2.5-flash",
     "endpoint": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"},
    {"name": "cerebras", "key_env": "CEREBRAS_API_KEY", "model": "llama-3.3-70b",
     "endpoint": "https://api.cerebras.ai/v1/chat/completions"},
    {"name": "groq", "key_env": "GROQ_API_KEY", "model": "llama-3.3-70b-versatile",
     "endpoint": "https://api.groq.com/openai/v1/chat/completions"},
    {"name": "mistral", "key_env": "MISTRAL_API_KEY", "model": "codestral-latest",
     "endpoint": "https://api.mistral.ai/v1/chat/completions"},
    {"name": "cohere", "key_env": "COHERE_API_KEY", "model": "command-r-plus",
     "endpoint": "https://api.cohere.com/v2/chat"},
    {"name": "ollama", "key_env": "OLLAMA_API_KEY", "model": "gemma4:31b-cloud",
     "endpoint": "http://localhost:11434/v1/chat/completions"},
    {"name": "sambanova", "key_env": "SAMBANOVA_API_KEY", "model": "Meta-Llama-3.3-70B-Instruct",
     "endpoint": "https://api.sambanova.ai/v1/chat/completions"},
    {"name": "openrouter", "key_env": "OPENROUTER_API_KEY", "model": "google/gemini-exp-1206:free",
     "endpoint": "https://openrouter.ai/api/v1/chat/completions"},
    {"name": "together", "key_env": "TOGETHER_API_KEY", "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
     "endpoint": "https://api.together.xyz/v1/chat/completions"},
    {"name": "hyperbolic", "key_env": "HYPERBOLIC_API_KEY", "model": "meta-llama/Llama-3.3-70B-Instruct",
     "endpoint": "https://api.hyperbolic.xyz/v1/chat/completions"},
]

def _get_provider(name: str):
    return next((p for p in PROVIDERS if p["name"] == name), None)

async def _call_openai_compat(p, system, user, endpoint=None, extra_headers=None):
    headers = {"Authorization": f"Bearer {os.environ.get(p['key_env'], 'unused')}", "Content-Type": "application/json"}
    if extra_headers: headers.update(extra_headers)
    payload = {
        "model": p["model"],
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.4,
    }
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(endpoint or p["endpoint"], headers=headers, json=payload)
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
    if r.status_code >= 400: raise RuntimeError(f"cohere {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["message"]["content"][0]["text"]

async def llm_call(role: str, system: str, user: str, sb=None) -> dict:
    mapping = AGENT_MODEL_MAP.get(role, {"provider": "gemini", "model": "gemini-2.5-flash"})
    primary_provider = mapping["provider"]
    primary_model = mapping["model"]
    
    # Define fallback chain (all free/generous tiers)
    fallback_chain = [primary_provider]
    for fallback in ["sambanova", "groq", "cerebras", "together", "hyperbolic", "gemini", "openrouter", "cohere"]:
        if fallback not in fallback_chain:
            fallback_chain.append(fallback)
            
    last_error = None
    
    for provider_name in fallback_chain:
        p = _get_provider(provider_name)
        if not p: continue
        
        # Determine model to use for fallback
        model_to_use = primary_model if provider_name == primary_provider else p["model"]
        p_use = {**p, "model": model_to_use}
        
        t0 = time.time()
        try:
            if p_use["name"] == "gemini":
                content = await _call_gemini(p_use, system, user)
            elif p_use["name"] == "cohere":
                content = await _call_cohere(p_use, system, user)
            else:
                content = await _call_openai_compat(p_use, system, user)
            
            latency = int((time.time() - t0) * 1000)
            if sb:
                try:
                    sb.table("jarvis_llm_calls").insert({"provider": p_use["name"], "model": p_use["model"], "role": role,
                                                         "status": "success", "latency_ms": latency}).execute()
                except Exception: pass
            
            if provider_name != primary_provider:
                log.info(f"Fallback successful: Used {provider_name} instead of {primary_provider}")
                
            return {"content": content, "provider": p_use["name"], "model": p_use["model"], "latency_ms": latency}
            
        except Exception as e:
            log.warning("LLM call failed for provider %s: %s", provider_name, e)
            last_error = e
            # Record failed call
            if sb:
                try:
                    sb.table("jarvis_llm_calls").insert({"provider": p_use["name"], "model": p_use["model"], "role": role,
                                                         "status": "failed", "latency_ms": int((time.time() - t0) * 1000)}).execute()
                except Exception: pass
            continue # Try next provider in the chain

    log.error("All fallback providers failed. Last error: %s", last_error)
    raise RuntimeError(f"LLM call failed for {role} after exhausting fallbacks. Last error: {last_error}")
