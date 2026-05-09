"""Jarvis OS 2.0: Cognitive Routing & Multi-Tier AI Architecture."""
import os, time, logging, json
from typing import Optional, Dict, List, Any, Tuple
import httpx
from datetime import datetime, timezone

log = logging.getLogger("jarvis.router")

# --- 1. MODEL TIER SYSTEM ---
MODEL_TIERS = {
    "GOD": {
        "models": ["claude-3-opus-20240229"],
        "description": "Planification initiale / architecture. Raisonnement profond."
    },
    "ELITE_VISUAL": {
        "models": ["gpt-4o"],
        "description": "SVG, UI, créativité visuelle."
    },
    "ELITE_LOGIC": {
        "models": ["claude-3-5-sonnet-latest"],
        "description": "Refactoring Python / logique. Précision structurelle."
    },
    "PRO": {
        "models": ["claude-3-haiku-20240307", "gpt-4o-mini"],
        "description": "Rédaction de fichiers / composants CSS. Rapport qualité/coût."
    },
    "WORKER": {
        "models": ["gemini-1.5-flash", "codestral-latest"],
        "description": "Parsing, formatage, tests unitaires. Tâche de routine."
    },
    "SLM": {
        "models": ["llama-3.3-70b", "phi-3"],
        "description": "Corrections syntaxiques légères. Coût ≈ 0$."
    }
}

API_PRICES = {
    "claude-3-opus-20240229": {"in": 15.00, "out": 75.00},
    "gemini-1.5-pro": {"in": 3.50, "out": 10.50},
    "claude-3-5-sonnet-latest": {"in": 3.00, "out": 15.00},
    "gpt-4o": {"in": 2.50, "out": 10.00},
    "gemini-2.0-flash": {"in": 0.10, "out": 0.40},
    "llama-3.3-70b": {"in": 0.20, "out": 0.60},
    "codestral-latest": {"in": 0.20, "out": 0.60},
    "command-r-plus": {"in": 3.00, "out": 15.00},
    "gemini-1.5-flash": {"in": 0.075, "out": 0.30},
    "gpt-4o-mini": {"in": 0.15, "out": 0.60},
    "claude-3-haiku-20240307": {"in": 0.25, "out": 1.25},
    "phi-3": {"in": 0.05, "out": 0.10},
    "llama-3.1-8b": {"in": 0.05, "out": 0.10},
    "command-r": {"in": 0.50, "out": 1.50},
}

# --- PROVIDER REGISTRY (Free Tiers & Fallbacks) ---
PROVIDERS = [
    {"id": "gemini", "endpoint": "https://generativelanguage.googleapis.com", "key_env": "GEMINI_API_KEY"},
    {"id": "anthropic", "endpoint": "https://api.anthropic.com/v1/messages", "key_env": "ANTHROPIC_API_KEY"},
    {"id": "openai", "endpoint": "https://api.openai.com/v1/chat/completions", "key_env": "OPENAI_API_KEY"},
    {"id": "cerebras", "endpoint": "https://api.cerebras.ai/v1/chat/completions", "key_env": "CEREBRAS_API_KEY"},
    {"id": "groq", "endpoint": "https://api.groq.com/openai/v1/chat/completions", "key_env": "GROQ_API_KEY"},
    {"id": "mistral", "endpoint": "https://api.mistral.ai/v1/chat/completions", "key_env": "MISTRAL_API_KEY"},
    {"id": "openrouter", "endpoint": "https://openrouter.ai/api/v1/chat/completions", "key_env": "OPENROUTER_API_KEY"},
    {"id": "together", "endpoint": "https://api.together.xyz/v1/chat/completions", "key_env": "TOGETHER_API_KEY"},
    {"id": "cohere", "endpoint": "https://api.cohere.ai/v1/chat/completions", "key_env": "COHERE_API_KEY"},
    {"id": "hyperbolic", "endpoint": "https://api.hyperbolic.xyz/v1/chat/completions", "key_env": "HYPERBOLIC_API_KEY"},
    {"id": "sambanova", "endpoint": "https://api.sambanova.ai/v1/chat/completions", "key_env": "SAMBANOVA_API_KEY"},
]

def _get_provider(pid: str) -> Optional[dict]:
    for p in PROVIDERS:
        if p["id"] == pid and os.environ.get(p["key_env"]): return p
    return None

# --- 2. CONTEXT ANALYZER ---

def prune_context(system: str, user: str, complexity: int) -> Tuple[str, str]:
    """Minimizes context sent to expensive models based on complexity."""
    # Context Caching: Activate native cache for Claude/Gemini (conceptual flag)
    # The actual caching is handled by passing repetitive system prompts unchanged.
    if complexity < 40:
        return system[:1000], user[:2000]
    if complexity > 80:
        return system, user
    return system[:3000], user[:5000]

async def summarize_buffer(messages: List[Dict[str, str]]) -> str:
    """Summary Buffer: Summarize last 10 messages in 3 key points using WORKER."""
    text = "\\n".join([f"{m['role']}: {m['content']}" for m in messages])
    prompt = f"Resume ces messages en exactement 3 points cles bullet-points :\\n{text}"
    try:
        # Use WORKER tier
        res = await llm_call("worker", "Tu es un re-formulateur concis.", prompt, manual_model="gemini-1.5-flash")
        return res["content"]
    except Exception:
        return "1. Context unavailable.\\n2. Proceed with current instruction.\\n3. No history."

def estimate_cost(tier: str, tokens_in: int = 1000, tokens_out: int = 1000) -> float:
    """Budget Guard: Estimate credit cost before GOD tier usage."""
    # Assuming standard credit formula
    if tier == "GOD":
        # 1M input = $15 -> 1000 tokens = $0.015 -> ~6.0 credits (margin 4.0)
        return ((tokens_in * 15.0 / 1_000_000) + (tokens_out * 75.0 / 1_000_000)) * 100 * 4.0
    return 1.0

# --- 3. TASK ANALYZER & COMPLEXITY SCORER ---

async def analyze_task(system: str, user: str) -> Dict[str, Any]:
    """Task Analyzer: Evaluates everything before routing."""
    analysis_prompt = f"""Evaluate this AI Task for routing. Return STRICT JSON.
System Prompt Length: {len(system)}
User Input: {user[:2000]}

JSON: {{
  "task_type": "coding|refactor|audit|architecture|chat|admin",
  "complexity": 0-100,
  "reasoning_depth": 0-100,
  "requires_premium": boolean,
  "reason": "short explanation for selection"
}}"""
    try:
        # Task Analysis is ALWAYS done on WORKER tier (90% cheap rule)
        res = await llm_call("worker", "Analyzer", analysis_prompt, manual_model="gemini-1.5-flash")
        data = json.loads(res["content"].strip().strip("```json").strip("```"))
        return data
    except Exception:
        return {"task_type": "chat", "complexity": 50, "reasoning_depth": 50, "requires_premium": False, "reason": "Default routing"}

def reorder_context(system: str, user: str) -> Tuple[str, str]:
    """LongContext Reordering: Places key instructions at the start and end of the prompt."""
    # Simple implementation: move the last 500 chars of system prompt to the front
    # to combat the 'lost in the middle' phenomenon in long contexts.
    if len(system) > 4000:
        tail = system[-1000:]
        head = system[:-1000]
        return f"{tail}\n\n{head}", user
    return system, user

# --- 4. MODEL ROUTER AI ---

def route_model(analysis: Dict[str, Any], task_role: str = "coder", ultra: bool = False, pref: str = "balanced") -> str:
    """The Core Business Logic: Optimized for Quality/Cost/Speed based on Directive 1."""
    # Strict Tier Assignment
    if task_role in ["ceo", "planner", "architect"]:
        # Tier GOD is ONLY for step 1 of the Builder (planning).
        return "claude-3-opus-20240229"
        
    if task_role in ["ux", "frontend", "visual"]:
        # ELITE (Visual)
        return "gpt-4o"
        
    if task_role in ["backend", "refactor", "security", "infra", "logic"]:
        # ELITE (Sonnet)
        return "claude-3-5-sonnet-latest"
        
    if task_role in ["coder", "css", "file_writer"]:
        # PRO
        return "gpt-4o-mini"
        
    if task_role in ["qa_test", "parser", "formatter", "worker"]:
        # WORKER
        return "gemini-1.5-flash"
        
    if task_role in ["bug_hunter", "syntax_checker"]:
        # SLM
        return "llama-3.3-70b"

    # Fallback to PRO
    return "gpt-4o-mini"

# --- 5. EXECUTION ENGINE ---

async def llm_call(role: str, system: str, user: str, sb=None, ultra: bool = False, manual_model: str = None, pref: str = "balanced") -> dict:
    t0 = time.time()
    
    # Step 1: Analysis (unless manual)
    if manual_model:
        model_name = manual_model
        analysis = {"complexity": 100, "reason": "Manual Override"}
    else:
        analysis = await analyze_task(system, user)
        model_name = route_model(analysis, role, ultra, pref)

    # Step 2: Context Management
    # Apply Pruning first
    sys_pruned, user_pruned = prune_context(system, user, analysis.get("complexity", 50))
    # Apply Reordering for better reasoning in ELITE/GOD tiers
    sys_final, user_final = reorder_context(sys_pruned, user_pruned)

    # Step 3: Provider Selection (Optimized for Availability & Free Tiers)
    provider = "gemini"
    if "claude" in model_name: 
        provider = "anthropic"
    elif "gpt" in model_name: 
        provider = "openai"
    elif "llama" in model_name: 
        # Favor Cerebras/Groq for Llama models
        provider = "cerebras" if _get_provider("cerebras") else "groq"
    elif "codestral" in model_name: 
        provider = "mistral"
    elif "command" in model_name: 
        provider = "cohere"
    
    # Fallback chain for reliability
    p = _get_provider(provider) or _get_provider("openrouter") or _get_provider("together") or _get_provider("gemini")
    
    try:
        if provider == "gemini":
            content, usage = await call_gemini_v2(p, model_name, sys_pruned, user_pruned)
        elif provider == "anthropic":
            content, usage = await call_anthropic_v2(p, model_name, sys_pruned, user_pruned)
        elif provider == "openai":
            content, usage = await call_openai_v2(p, model_name, sys_pruned, user_pruned)
        else:
            content, usage = await call_openai_compat_v2(p, model_name, sys_pruned, user_pruned)

        latency = int((time.time() - t0) * 1000)
        
        # Determine Tier
        tier = "WORKER"
        for t, m in MODEL_TIERS.items():
            if model_name in m["models"]: tier = t; break
            
        return {
            "content": content, "provider": provider, "model": model_name, "tier": tier,
            "latency_ms": latency, "usage": usage, "analysis": analysis
        }
    except Exception as e:
        log.error(f"Routing failed for {model_name}: {e}")
        if not manual_model and model_name != "gemini-1.5-flash":
            return await llm_call(role, system, user, sb, ultra=False, manual_model="gemini-1.5-flash")
        raise

# --- API ADAPTERS ---

async def call_gemini_v2(p, model, system, user):
    key = os.environ[p["key_env"]]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    payload = {"contents": [{"role": "user", "parts": [{"text": f"{system}\n\n{user}"}]}], "generationConfig": {"temperature": 0.4}}
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(url, json=payload)
    if r.status_code >= 400: raise RuntimeError(f"gemini {r.status_code}: {r.text[:200]}")
    data = r.json()
    content = data["candidates"][0]["content"]["parts"][0]["text"]
    usage = data.get("usageMetadata", {})
    return content, {"prompt_tokens": usage.get("promptTokenCount", 0), "completion_tokens": usage.get("candidatesTokenCount", 0), "total_tokens": usage.get("totalTokenCount", 0)}

async def call_anthropic_v2(p, model, system, user):
    headers = {"x-api-key": os.environ[p["key_env"]], "anthropic-version": "2023-06-01", "content-type": "application/json"}
    payload = {"model": model, "system": system, "messages": [{"role": "user", "content": user}], "max_tokens": 4096, "temperature": 0.4}
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(p["endpoint"], headers=headers, json=payload)
    if r.status_code >= 400: raise RuntimeError(f"anthropic {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["content"][0]["text"], {"prompt_tokens": data["usage"]["input_tokens"], "completion_tokens": data["usage"]["output_tokens"], "total_tokens": data["usage"]["input_tokens"] + data["usage"]["output_tokens"]}

async def call_openai_v2(p, model, system, user):
    headers = {"Authorization": f"Bearer {os.environ[p['key_env']]}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0.4}
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(p["endpoint"], headers=headers, json=payload)
    if r.status_code >= 400: raise RuntimeError(f"openai {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["choices"][0]["message"]["content"], {"prompt_tokens": data["usage"]["prompt_tokens"], "completion_tokens": data["usage"]["completion_tokens"], "total_tokens": data["usage"]["total_tokens"]}

async def call_openai_compat_v2(p, model, system, user):
    headers = {"Authorization": f"Bearer {os.environ.get(p['key_env'], 'unused')}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0.4}
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(p["endpoint"], headers=headers, json=payload)
    if r.status_code >= 400: raise RuntimeError(f"compat {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["choices"][0]["message"]["content"], {"prompt_tokens": data["usage"]["prompt_tokens"], "completion_tokens": data["usage"]["completion_tokens"], "total_tokens": data["usage"]["total_tokens"]}

# --- API ADAPTERS (V2) ---

async def call_gemini_v2(p, model, system, user):
    key = os.environ[p["key_env"]]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    payload = {"contents": [{"role": "user", "parts": [{"text": f"{system}\n\n{user}"}]}], "generationConfig": {"temperature": 0.4}}
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(url, json=payload)
    if r.status_code >= 400: raise RuntimeError(f"gemini {r.status_code}: {r.text[:200]}")
    data = r.json()
    content = data["candidates"][0]["content"]["parts"][0]["text"]
    usage = data.get("usageMetadata", {"totalTokenCount": len(content)//4 + len(system+user)//4})
    return content, {"prompt_tokens": usage.get("promptTokenCount", 0), "completion_tokens": usage.get("candidatesTokenCount", 0), "total_tokens": usage.get("totalTokenCount", 0)}

async def call_anthropic_v2(p, model, system, user):
    headers = {"x-api-key": os.environ[p["key_env"]], "anthropic-version": "2023-06-01", "content-type": "application/json"}
    payload = {"model": model, "system": system, "messages": [{"role": "user", "content": user}], "max_tokens": 4096, "temperature": 0.4}
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(p["endpoint"], headers=headers, json=payload)
    if r.status_code >= 400: raise RuntimeError(f"anthropic {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["content"][0]["text"], {"prompt_tokens": data["usage"]["input_tokens"], "completion_tokens": data["usage"]["output_tokens"], "total_tokens": data["usage"]["input_tokens"] + data["usage"]["output_tokens"]}

async def call_openai_v2(p, model, system, user):
    headers = {"Authorization": f"Bearer {os.environ[p['key_env']]}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0.4}
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(p["endpoint"], headers=headers, json=payload)
    if r.status_code >= 400: raise RuntimeError(f"openai {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["choices"][0]["message"]["content"], {"prompt_tokens": data["usage"]["prompt_tokens"], "completion_tokens": data["usage"]["completion_tokens"], "total_tokens": data["usage"]["total_tokens"]}

async def call_openai_compat_v2(p, model, system, user):
    headers = {"Authorization": f"Bearer {os.environ.get(p['key_env'], 'unused')}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0.4}
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(p["endpoint"], headers=headers, json=payload)
    if r.status_code >= 400: raise RuntimeError(f"compat {r.status_code}: {r.text[:200]}")
    data = r.json()
    return data["choices"][0]["message"]["content"], {"prompt_tokens": data["usage"]["prompt_tokens"], "completion_tokens": data["usage"]["completion_tokens"], "total_tokens": data["usage"]["total_tokens"]}
