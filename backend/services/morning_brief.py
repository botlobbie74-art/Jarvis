import asyncio
import logging
from datetime import datetime, timezone
from intelligent_router import call_with_fallback

log = logging.getLogger("jarvis.morning_brief")

async def generate_morning_brief(uid: str, sb):
    """Generates a 5-line summary for the user and sends it via Telegram."""
    try:
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
        
        from server import _consume_credits_v2
        res = await call_with_fallback("research", "worker", "Morning Briefing Specialist", brief_prompt, sb, 100, "pro")
        
        # Deduct 10 credits after success
        _consume_credits_v2(uid, res["model"], res["tier"], {}, "Morning Briefing", task_role="morning_brief")
        
        # Send via Telegram
        from services.telegram_service import send_telegram_notification
        await send_telegram_notification(uid, f"☀️ *Bonjour {user_name} ! Voici votre briefing :*\n\n{res['content']}", sb)
        
        return True
    except Exception as e:
        log.error(f"Morning brief failed for {uid}: {e}")
        return False


async def reset_daily_free_credits(sb):
    """
    Resets free-tier users to 50 credits at midnight UTC.
    Referred users get 100 credits instead of 50.
    """
    log.info("[Cron] Resetting daily free credits for free users...")
    try:
        # Select users who have no paid tier (tier is null or 'free')
        # Since Python supabase client lacks a simple OR, we do two queries or just fetch all and filter,
        # but the cleanest way is calling the RPC if we added it, else fetch 'free' and null separately.
        free_tier = sb.table("jarvis_users").select("id, referred_by").eq("tier", "free").execute()
        null_tier = sb.table("jarvis_users").select("id, referred_by").is_("tier", "null").execute()
        
        all_free_users = (free_tier.data or []) + (null_tier.data or [])
        
        for u in all_free_users:
            daily_credits = 100.0 if u.get("referred_by") else 50.0
            sb.table("jarvis_users").update({"credits": daily_credits}).eq("id", u["id"]).execute()
            
        log.info(f"[Cron] Reset {len(all_free_users)} free users to daily credits.")
    except Exception as e:
        log.error(f"[Cron] Daily credit reset failed: {e}")


async def morning_brief_daemon(sb):
    """Background daemon: sends morning briefs at 8:00 AM UTC and resets credits at midnight."""
    log.info("Morning Brief Daemon started.")
    last_credit_reset_day = None
    last_brief_day = None
    
    while True:
        try:
            now = datetime.now(timezone.utc)
            today = now.date()

            # 1. Reset daily credits at midnight (once per day)
            if last_credit_reset_day != today and now.hour == 0:
                await reset_daily_free_credits(sb)
                last_credit_reset_day = today

            # 2. Send morning briefs at 8 AM (once per day)
            if last_brief_day != today and now.hour == 8:
                users = sb.table("jarvis_users").select("id").eq("morning_brief_enabled", True).execute()
                for u in (users.data or []):
                    today_iso = today.isoformat()
                    exists = sb.table("morning_briefs").select("id").eq("user_id", u["id"]).gte("created_at", today_iso).execute()
                    if not exists.data:
                        success = await generate_morning_brief(u["id"], sb)
                        if success:
                            sb.table("morning_briefs").insert({"user_id": u["id"], "status": "sent"}).execute()
                last_brief_day = today

            await asyncio.sleep(3600)  # Check every hour
        except Exception as e:
            log.error(f"Daemon error: {e}")
            await asyncio.sleep(60)
