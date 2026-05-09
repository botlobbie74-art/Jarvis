import os
import httpx
import logging
from datetime import datetime, timezone
from supabase import Client, create_client

log = logging.getLogger("jarvis.telegram")

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')

sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async def send_telegram_notification(user_id: str, message: str):
    """Sends a Telegram notification to the user if they have linked their account."""
    if not TELEGRAM_BOT_TOKEN:
        return
        
    try:
        # 1. Get telegram_chat_id from jarvis_plugins
        res = sb.table("jarvis_plugins").select("metadata").eq("user_id", user_id).eq("plugin_id", "telegram").eq("status", "connected").execute()
        
        if not res.data:
            return # Not connected
            
        chat_id = res.data[0].get("metadata", {}).get("telegram_chat_id")
        if not chat_id:
            return
            
        # 2. Send message
        async with httpx.AsyncClient(timeout=10) as cli:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown"
            }
            r = await cli.post(url, json=payload)
            if r.status_code >= 400:
                log.error(f"Telegram API error: {r.text}")
                return
                
        # 3. Log notification in Supabase (if table exists)
        try:
            sb.table("jarvis_notifications").insert({
                "user_id": user_id,
                "message": message,
                "channel": "telegram",
                "sent_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            log.warning(f"Failed to log notification: {e}")
            
    except Exception as e:
        log.error(f"Telegram notification failed: {e}")
        # Never crash the app for a failed notification
