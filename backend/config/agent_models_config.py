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

    # FREE TIER / HIGH SPEED (Groq)
    "mission_parse":         {"provider": "groq",     "model": "llama-3.1-8b-instant",     "credits": 3},
    "intent_detection":      {"provider": "groq",     "model": "llama-3.1-8b-instant",     "credits": 1},
    "spam_detection":        {"provider": "groq",     "model": "llama-3.1-8b-instant",     "credits": 2},
    "comment_classify":      {"provider": "groq",     "model": "llama-3.1-8b-instant",     "credits": 2},
    "user_dna_update":       {"provider": "groq", "model": "llama-3.3-70b-versatile",            "credits": 0}, # Premium feature, 0 extra cost

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

PERSONAL_AGENT_COSTS = {
    # APPELS API DIRECTS — 0 token, marge infinie
    "google_auth_check":        {"credits": 0,  "model": None,                        "provider": None},
    "calendar_reminder":        {"credits": 2,  "model": None,                        "provider": None},
    "sheets_write":             {"credits": 3,  "model": None,                        "provider": None},
    "sheets_create":            {"credits": 5,  "model": None,                        "provider": None},
    "notification_telegram":    {"credits": 0,  "model": None,                        "provider": None},

    # TIER GRATUIT — Groq llama-3.1-8b-instant
    "intent_detection":         {"credits": 2,  "model": "llama-3.1-8b-instant",      "provider": "groq"},
    "spam_detection":           {"credits": 2,  "model": "llama-3.1-8b-instant",      "provider": "groq"},
    "user_dna_update":          {"credits": 0,  "model": "llama-3.1-8b-instant",      "provider": "groq"},

    # TIER WORKER — Groq llama-3.3-70b-versatile
    "gmail_fetch":              {"credits": 5,  "model": "llama-3.3-70b-versatile",   "provider": "groq"},
    "gmail_delete_spam":        {"credits": 8,  "model": "llama-3.3-70b-versatile",   "provider": "groq"},
    "gmail_categorize":         {"credits": 10, "model": "llama-3.3-70b-versatile",   "provider": "groq"},
    "youtube_fetch_stats":      {"credits": 5,  "model": "llama-3.3-70b-versatile",   "provider": "groq"},
    "youtube_analyze_comments": {"credits": 12, "model": "llama-3.3-70b-versatile",   "provider": "groq"},
    "final_report":             {"credits": 8,  "model": "llama-3.3-70b-versatile",   "provider": "groq"},

    # TIER ELITE — claude-3-5-sonnet (qualité nécessaire)
    "gmail_reply":              {"credits": 15, "model": "claude-3-5-sonnet-latest",  "provider": "anthropic"},
    "youtube_scripts":          {"credits": 25, "model": "claude-3-5-sonnet-latest",  "provider": "anthropic"},
    "youtube_comments_reply":   {"credits": 5,  "model": "claude-3-5-sonnet-latest",  "provider": "anthropic"},
    "deep_research":            {"credits": 60, "model": "gpt-4o",                    "provider": "openai"},

    # TIER GOD — builder uniquement
    "build_start":              {"credits": 80, "model": "claude-3-opus-20240229",    "provider": "anthropic"},
}
