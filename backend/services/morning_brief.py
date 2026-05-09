import asyncio
import logging
from datetime import datetime, time, timezone
from intelligent_router import call_with_fallback

log = logging.getLogger("jarvis.morning_brief")

async def generate_morning_brief(uid: str, sb):
    """Generates a 5-line summary for the user."""
    try:
        # 1. Fetch relevant data
        # Emails (mock/fetch)
        # YouTube stats (mock/fetch)
        # Reminders (mock/fetch)
        
        # For now, let's use a prompt to simulate fetching and summarizing
        user_res = sb.table("jarvis_users").select("name, dna_profile").eq("id", uid).single().execute()
        user_name = user_res.data.get("name", "User")
        dna = user_res.data.get("dna_profile", {})
        
        brief_prompt = f"""Generate a Morning Brief for {user_name}.
        Style: {dna.get('communication_style', 'direct and professional')}
        
        Include:
        1. 2-3 Important emails from the night (simulated).
        2. YouTube stats from the last 24h (simulated).
        3. Today's reminders (simulated).
        
        Return exactly 5 lines. Be concise.
        """
        
        # Use Groq 70B for the brief (10 credits as requested)
        from server import _consume_credits_v2
        res = await call_with_fallback("research", "worker", "Morning Briefing Specialist", brief_prompt, sb, 100, "pro")
        
        # 2. Deduct 10 credits
        _consume_credits_v2(uid, res["model"], res["tier"], {}, "Morning Briefing", task_role="morning_brief")
        
        # 3. Send via Telegram
        from services.telegram_service import send_telegram_notification
        await send_telegram_notification(uid, f"☀️ *Bonjour {user_name} ! Voici votre briefing :*\n\n{res['content']}", sb)
        
        return True
    except Exception as e:
        log.error(f"Morning brief failed for {uid}: {e}")
        return False

async def morning_brief_daemon(sb):
    """Background daemon to send briefs at 8:00 AM."""
    log.info("Morning Brief Daemon started.")
    while True:
        try:
            now = datetime.now(timezone.utc)
            # Check for users who have briefs enabled and haven't received one today
            # Simple logic: run once every hour and check if it's 8 AM
            if now.hour == 8:
                users = sb.table("jarvis_users").select("id").eq("morning_brief_enabled", True).execute()
                for u in users.data:
                    # Check if brief already sent today in morning_briefs table
                    today = now.date().isoformat()
                    exists = sb.table("morning_briefs").select("id").eq("user_id", u["id"]).filter("created_at", "gte", today).execute()
                    if not exists.data:
                        success = await generate_morning_brief(u["id"], sb)
                        if success:
                            sb.table("morning_briefs").insert({"user_id": u["id"], "status": "sent"}).execute()
            
            # Wait for 1 hour
            await asyncio.sleep(3600)
        except Exception as e:
            log.error(f"Daemon error: {e}")
            await asyncio.sleep(60)

