CHIEF_OF_STAFF_COSTS = {
  # APPELS API DIRECTS — 0 token IA, marge infinie
  "reminder":              2,   # Google Calendar API
  "google_sheets_read":    2,   # Google Sheets API
  "google_sheets_write":   3,   # Google Sheets API
  "site_analytics_fetch":  2,   # Analytics API

  # TIER WORKER — gemini-1.5-flash / llama via Cerebras
  "mission_parse":         3,   # Parser le message initial
  "youtube_stats_fetch":   5,   # Lire + formater les stats YouTube
  "youtube_comments_analyze": 8, # Analyser N commentaires
  "gmail_cleanup":         10,  # Trier spam + catégoriser
  "site_analytics_report": 8,   # Formater rapport analytics
  "user_dna_update":       0,   # Gratuit — tourne en arrière-plan

  # TIER ELITE — claude-3-5-sonnet
  "youtube_scripts":       25,  # Par script généré
  "youtube_comments_reply": 5,  # Par réponse générée
  "gmail_auto_reply":      8,   # Par email rédigé
  "deep_research":         60,  # Recherche web approfondie
  "final_report":          10,  # Rapport consolidé final
  
  # APP_BUILD fallback
  "app_build":             100
}
