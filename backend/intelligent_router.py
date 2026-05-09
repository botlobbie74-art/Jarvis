import asyncio
import logging
import time
from typing import Dict, Any, Optional
from supabase import Client

# Need to import llm_call locally inside the function to avoid circular imports if any, 
# but it's safe to import here as llm_router doesn't import intelligent_router.
from llm_router import llm_call

log = logging.getLogger("jarvis.router.intelligent")

TASK_ROUTING = {
    "strategy_decision":  {"primary": "groq/llama-3.3-70b-versatile",   "fallback": "gemini/gemini-1.5-flash",          "cheap": "groq/llama-3.1-8b-instant"},
    "architecture":       {"primary": "anthropic/claude-3-opus-20240229", "fallback": "anthropic/claude-3-5-sonnet-latest", "cheap": "openai/gpt-4o-mini"},
    "code_generation":    {"primary": "anthropic/claude-3-5-sonnet-latest","fallback": "openai/gpt-4o",                    "cheap": "mistral/codestral-latest"},
    "ui_design":          {"primary": "openai/gpt-4o",                    "fallback": "gemini/gemini-2.5-flash",          "cheap": "gemini/gemini-1.5-flash"},
    "refactor":           {"primary": "anthropic/claude-3-5-sonnet-latest","fallback": "openai/gpt-4o",                    "cheap": "mistral/codestral-latest"},
    "research":           {"primary": "openai/gpt-4o",                    "fallback": "gemini/gemini-2.5-pro",            "cheap": "groq/llama-3.3-70b-versatile"},
    "chat":               {"primary": "gemini/gemini-1.5-flash",          "fallback": "groq/llama-3.3-70b-versatile",     "cheap": "groq/llama-3.1-8b-instant"},
    "parse":              {"primary": "groq/llama-3.1-8b-instant",        "fallback": "gemini/gemini-1.5-flash",          "cheap": "groq/llama-3.1-8b-instant"},
    "test_generation":    {"primary": "groq/llama-3.3-70b-versatile",     "fallback": "gemini/gemini-1.5-flash",          "cheap": "groq/llama-3.1-8b-instant"},
    "debug":              {"primary": "anthropic/claude-3-5-sonnet-latest","fallback": "openai/gpt-4o",                    "cheap": "groq/llama-3.3-70b-versatile"},
    "telegram_intent":    {"primary": "groq/llama-3.1-8b-instant",        "fallback": "gemini/gemini-1.5-flash",          "cheap": "groq/llama-3.1-8b-instant"},
}

def parse_model(model_string: str) -> Dict[str, str]:
    if not model_string:
        return {"provider": "groq", "model": "llama-3.1-8b-instant"}
    if "/" in model_string:
        parts = model_string.split("/", 1)
        return {"provider": parts[0], "model": parts[1]}
    if model_string.startswith("claude"): return {"provider": "anthropic", "model": model_string}
    if model_string.startswith("gpt"): return {"provider": "openai", "model": model_string}
    if model_string.startswith("gemini"): return {"provider": "gemini", "model": model_string}
    if model_string.startswith("codestral"): return {"provider": "mistral", "model": model_string}
    return {"provider": "groq", "model": model_string}

async def smart_route(task_type: str, user_credits: int, user_tier: str, retry_count: int = 0) -> Dict[str, str]:
    routing = TASK_ROUTING.get(task_type, TASK_ROUTING["chat"])

    if user_tier == "starter": return parse_model(routing["cheap"])
    if user_tier == "free": return parse_model(routing["cheap"])
    if user_credits < 50: return parse_model(routing["cheap"])
    if retry_count > 0: return parse_model(routing["fallback"])
    return parse_model(routing["primary"])

async def call_with_fallback(task_type: str, role: str, system: str, user: str, sb: Client, user_credits: int, user_tier: str, thinking_mode: str = "normal", dna: dict = None) -> Dict[str, Any]:
    retry_count = 0
    
    while retry_count < 3:
        route = await smart_route(task_type, user_credits, user_tier, retry_count)
        provider = route["provider"]
        model = route["model"]
        
        start_time = time.time()
        try:
            response = await llm_call(role, system, user, sb=sb, manual_model=model, thinking_mode=thinking_mode, dna=dna)
            latency_ms = int((time.time() - start_time) * 1000)
            
            try:
                sb.table("model_calls").insert({
                    "task_type": task_type,
                    "provider": provider,
                    "model": model,
                    "user_tier": user_tier,
                    "credits_consumed": 0,
                    "status": "success",
                    "retry_count": retry_count,
                    "latency_ms": latency_ms
                }).execute()
            except Exception as log_err:
                log.error(f"Failed to log success: {log_err}")
                
            return response
            
        except Exception as err:
            err_msg = str(err)
            log.error(f"[Router] {provider}/{model} failed: {err_msg}")
            latency_ms = int((time.time() - start_time) * 1000)
            
            try:
                sb.table("model_calls").insert({
                    "task_type": task_type,
                    "provider": provider,
                    "model": model,
                    "user_tier": user_tier,
                    "credits_consumed": 0,
                    "status": "fallback" if retry_count == 0 else "error",
                    "retry_count": retry_count,
                    "latency_ms": latency_ms,
                    "error": err_msg
                }).execute()
            except Exception as log_err:
                log.error(f"Failed to log error: {log_err}")
                
            retry_count += 1
            
            if "rate_limit" in err_msg.lower() or "429" in err_msg:
                await asyncio.sleep(30)
            else:
                await asyncio.sleep(2)
                
    raise RuntimeError("Tous les modèles ont échoué pour cette tâche.")
