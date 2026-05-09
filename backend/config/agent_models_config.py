"""
Model Router & Credit Configuration for Jarvis Agents.
Optimized for the multi-tier agentic workflow.
"""

AGENT_MODELS = {
    # API-ONLY TASKS (Margin pure, no LLM cost)
    "reminder":              {"provider": None,      "model": None,                       "credits": 2},
    "sheets_read":           {"provider": None,      "model": None,                       "credits": 2},
    "sheets_write":          {"provider": None,      "model": None,                       "credits": 3},
    "analytics_fetch":       {"provider": None,      "model": None,                       "credits": 2},

    # FREE TIER / HIGH SPEED (Groq/Cerebras)
    "mission_parse":         {"provider": "groq",     "model": "llama-3.1-8b-instant",     "credits": 3},
    "intent_detection":      {"provider": "groq",     "model": "llama-3.1-8b-instant",     "credits": 1},
    "spam_detection":        {"provider": "groq",     "model": "llama-3.1-8b-instant",     "credits": 2},
    "comment_classify":      {"provider": "groq",     "model": "llama-3.1-8b-instant",     "credits": 2},
    "user_dna_update":       {"provider": "cerebras", "model": "llama-3.3-70b",            "credits": 0}, # Premium feature, 0 extra cost

    # WORKER TIER (Gemini Flash)
    "gmail_triage":          {"provider": "gemini",   "model": "gemini-1.5-flash",         "credits": 5},
    "youtube_stats_summary": {"provider": "gemini",   "model": "gemini-1.5-flash",         "credits": 5},
    "analytics_report":      {"provider": "gemini",   "model": "gemini-1.5-flash",         "credits": 8},
    "summary_buffer":        {"provider": "gemini",   "model": "gemini-1.5-flash",         "credits": 3},
    "comment_analyze":       {"provider": "gemini",   "model": "gemini-1.5-flash",         "credits": 8},

    # ELITE TIER (Claude Sonnet / GPT-4o)
    "youtube_scripts":       {"provider": "anthropic","model": "claude-3-5-sonnet-latest", "credits": 25},
    "comment_reply":         {"provider": "anthropic","model": "claude-3-5-sonnet-latest", "credits": 5},
    "gmail_reply":           {"provider": "anthropic","model": "claude-3-5-sonnet-latest", "credits": 8},
    "final_report":          {"provider": "anthropic","model": "claude-3-5-sonnet-latest", "credits": 10},

    # ELITE VISUAL / SEARCH
    "deep_research":         {"provider": "openai",    "model": "gpt-4o",                  "credits": 60},

    # GOD TIER (Builder Planning Only)
    "builder_planning":      {"provider": "anthropic", "model": "claude-3-opus-20240229",   "credits": 80},
}
