import os
import httpx
import logging
import re
import uuid
import base64
from email.message import EmailMessage
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any, Awaitable, Callable, Dict, Optional
from supabase import Client, create_client
from dotenv import load_dotenv

log = logging.getLogger("jarvis.telegram")

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')

sb: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_URL and SUPABASE_SERVICE_KEY else None

TELEGRAM_PLUGIN_URL = "https://jarvisagent.app/app/plugins"

IntentCallbacks = Dict[str, Callable[..., Awaitable[str]]]

async def send_telegram_message(chat_id: str, message: str, parse_mode: Optional[str] = "Markdown"):
    if not TELEGRAM_BOT_TOKEN:
        return
    payload = {"chat_id": chat_id, "text": message}
    if parse_mode:
        payload["parse_mode"] = parse_mode
    async with httpx.AsyncClient(timeout=15) as cli:
        r = await cli.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json=payload)
        if r.status_code >= 400:
            log.error(f"Telegram API error: {r.text}")

async def send_telegram_notification(user_id: str, message: str, sb_client: Optional[Client] = None):
    """Sends a Telegram notification to the user if they have linked their account."""
    if not TELEGRAM_BOT_TOKEN:
        return
    db = sb_client or sb
    if not db:
        return
        
    try:
        # 1. Get telegram_chat_id from jarvis_plugins
        res = db.table("jarvis_plugins").select("metadata").eq("user_id", user_id).eq("plugin_id", "telegram").eq("status", "connected").execute()
        
        if not res.data:
            return # Not connected
            
        chat_id = res.data[0].get("metadata", {}).get("telegram_chat_id")
        if not chat_id:
            return
            
        # 2. Send message
        await send_telegram_message(chat_id, message)
                
        # 3. Log notification in Supabase (if table exists)
        try:
            db.table("jarvis_notifications").insert({
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

def _norm(text: str) -> str:
    text = text.lower().strip()
    swaps = {
        "é": "e", "è": "e", "ê": "e", "ë": "e",
        "à": "a", "â": "a",
        "î": "i", "ï": "i",
        "ô": "o",
        "ù": "u", "û": "u",
        "ç": "c",
    }
    for a, b in swaps.items():
        text = text.replace(a, b)
    return text

def _after(text: str, patterns: list[str]) -> str:
    original = text.strip()
    normalized = _norm(text)
    for pattern in patterns:
        m = re.search(pattern, normalized)
        if m:
            start = m.end()
            return original[start:].strip(" :,-")
    return original

def _google_connect_message(product: str) -> str:
    return f"Pour faire ça, connecte d'abord ton Google {product} dans les Plugins : {TELEGRAM_PLUGIN_URL}"

async def _plugin_metadata(uid: str, plugin_id: str) -> Optional[dict]:
    if not sb:
        raise RuntimeError("Supabase not configured")
    res = sb.table("jarvis_plugins").select("metadata,status").eq("user_id", uid).eq("plugin_id", plugin_id).execute()
    if not res.data or res.data[0].get("status") != "connected":
        return None
    return res.data[0].get("metadata") or {}

async def _google_token(uid: str, product: str) -> Optional[str]:
    meta = await _plugin_metadata(uid, "google")
    if not meta:
        return None
    scope = meta.get("scope") or ""
    required = {
        "Gmail": "gmail.",
        "Calendar": "calendar",
        "YouTube": "youtube",
        "Drive": "drive",
    }.get(product)
    if required and required not in scope:
        return None
    return meta.get("access_token")

async def _run_background(chat_id: str, title: str, job: Callable[[], Awaitable[str]]):
    try:
        result = await job()
        await send_telegram_message(chat_id, f"✅ {title} terminé.\n{result}")
    except Exception as e:
        log.exception("telegram background task failed")
        await send_telegram_message(chat_id, f"❌ {title} a échoué : {str(e)[:300]}")

async def _create_google_sheet(uid: str, description: str) -> str:
    token = await _google_token(uid, "Drive")
    if not token:
        return _google_connect_message("Drive")
    title = description.strip() or f"Jarvis Sheet {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.post("https://sheets.googleapis.com/v4/spreadsheets", headers=headers, json={"properties": {"title": title[:90]}})
        if r.status_code >= 400:
            return f"Google Sheets a répondu avec une erreur : {r.text[:300]}"
        data = r.json()
        spreadsheet_id = data.get("spreadsheetId")
        url = data.get("spreadsheetUrl") or f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"
        rows = [["Créé par Jarvis", datetime.now(timezone.utc).isoformat()], ["Description", description]]
        await cli.post(
            f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/A1:append?valueInputOption=USER_ENTERED",
            headers=headers,
            json={"values": rows},
        )
        return f"Google Sheet créé : {url}"

async def _gmail_list(token: str, query: str, max_results: int = 10) -> list[dict]:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.get("https://gmail.googleapis.com/gmail/v1/users/me/messages", headers=headers, params={"q": query, "maxResults": max_results})
    if r.status_code >= 400:
        raise RuntimeError(f"Gmail API error: {r.text[:300]}")
    return r.json().get("messages", [])

async def _gmail_get(token: str, message_id: str, fmt: str = "metadata") -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    params = {"format": fmt, "metadataHeaders": ["From", "Subject"]}
    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.get(f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}", headers=headers, params=params)
    if r.status_code >= 400:
        raise RuntimeError(f"Gmail API error: {r.text[:300]}")
    return r.json()

def _gmail_header(message: dict, name: str) -> str:
    headers = message.get("payload", {}).get("headers", [])
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""

async def _gmail_label_id(token: str, name: str) -> str:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.get("https://gmail.googleapis.com/gmail/v1/users/me/labels", headers=headers)
        if r.status_code >= 400:
            raise RuntimeError(f"Gmail label error: {r.text[:300]}")
        for label in r.json().get("labels", []):
            if label.get("name") == name:
                return label["id"]
        cr = await cli.post("https://gmail.googleapis.com/gmail/v1/users/me/labels", headers=headers, json={"name": name, "labelListVisibility": "labelShow", "messageListVisibility": "show"})
        if cr.status_code >= 400:
            raise RuntimeError(f"Gmail label create error: {cr.text[:300]}")
        return cr.json()["id"]

async def _gmail_modify(token: str, message_id: str, add_labels: list[str], remove_labels: list[str]):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.post(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/modify",
            headers=headers,
            json={"addLabelIds": add_labels, "removeLabelIds": remove_labels},
        )
    if r.status_code >= 400:
        raise RuntimeError(f"Gmail modify error: {r.text[:300]}")

async def _gmail_cleanup_spam(uid: str) -> str:
    token = await _google_token(uid, "Gmail")
    if not token:
        return _google_connect_message("Gmail")
    messages = await _gmail_list(token, "in:spam", 25)
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30) as cli:
        for msg in messages:
            await cli.post(f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}/trash", headers=headers)
    return f"{len(messages)} spam(s) déplacé(s) dans la corbeille Gmail."

async def _gmail_organize(uid: str) -> str:
    token = await _google_token(uid, "Gmail")
    if not token:
        return _google_connect_message("Gmail")
    messages = await _gmail_list(token, "in:inbox newer_than:30d", 20)
    label_ids = {
        "important": await _gmail_label_id(token, "Jarvis/Important"),
        "news": await _gmail_label_id(token, "Jarvis/Newsletters"),
        "todo": await _gmail_label_id(token, "Jarvis/A traiter"),
    }
    counts = {"important": 0, "news": 0, "todo": 0}
    for msg in messages:
        meta = await _gmail_get(token, msg["id"])
        subject = _gmail_header(meta, "Subject").lower()
        sender = _gmail_header(meta, "From").lower()
        snippet = (meta.get("snippet") or "").lower()
        blob = f"{sender} {subject} {snippet}"
        if any(x in blob for x in ["urgent", "facture", "invoice", "payment", "paiement", "client"]):
            bucket = "important"
        elif any(x in blob for x in ["newsletter", "unsubscribe", "promo", "offre", "marketing"]):
            bucket = "news"
        else:
            bucket = "todo"
        await _gmail_modify(token, msg["id"], [label_ids[bucket]], ["INBOX"])
        counts[bucket] += 1
    return f"Mails rangés : {counts['important']} important(s), {counts['news']} newsletter(s), {counts['todo']} à traiter."

def _raw_email(to_addr: str, subject: str, body: str, in_reply_to: Optional[str] = None) -> str:
    msg = EmailMessage()
    msg["To"] = to_addr
    msg["Subject"] = subject if subject.lower().startswith("re:") else f"Re: {subject}"
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    msg.set_content(body)
    return base64.urlsafe_b64encode(msg.as_bytes()).decode().rstrip("=")

async def _gmail_draft_replies(uid: str, instructions: str, callbacks: IntentCallbacks) -> str:
    token = await _google_token(uid, "Gmail")
    if not token:
        return _google_connect_message("Gmail")
    llm = callbacks.get("llm_sonnet")
    if not llm:
        return "Génération Sonnet indisponible côté serveur."
    messages = await _gmail_list(token, "in:inbox newer_than:14d", 5)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    drafted = 0
    async with httpx.AsyncClient(timeout=45) as cli:
        for msg in messages:
            meta = await _gmail_get(token, msg["id"])
            sender = _gmail_header(meta, "From")
            subject = _gmail_header(meta, "Subject") or "Sans objet"
            snippet = meta.get("snippet") or ""
            prompt = (
                "Rédige une réponse email en français, concise et professionnelle. "
                "Retourne uniquement le corps du mail.\n\n"
                f"Instructions utilisateur: {instructions}\n"
                f"Expéditeur: {sender}\nSujet: {subject}\nExtrait: {snippet}"
            )
            body = await llm(prompt)
            raw = _raw_email(sender, subject, body)
            r = await cli.post("https://gmail.googleapis.com/gmail/v1/users/me/drafts", headers=headers, json={"message": {"raw": raw, "threadId": meta.get("threadId")}})
            if r.status_code < 400:
                drafted += 1
    return f"{drafted} brouillon(s) de réponse créé(s) dans Gmail."

async def _youtube_stats(uid: str) -> str:
    token = await _google_token(uid, "YouTube")
    if not token:
        return _google_connect_message("YouTube")
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.get("https://www.googleapis.com/youtube/v3/channels", headers=headers, params={"part": "statistics,snippet", "mine": "true"})
    if r.status_code >= 400:
        return f"YouTube Data API a répondu avec une erreur : {r.text[:300]}"
    items = r.json().get("items", [])
    if not items:
        return "Aucune chaîne YouTube trouvée sur ce compte Google."
    channel = items[0]
    stats = channel.get("statistics", {})
    title = channel.get("snippet", {}).get("title", "ta chaîne")
    return (
        f"Stats de {title} : {int(stats.get('subscriberCount', 0)):,} abonnés, "
        f"{int(stats.get('viewCount', 0)):,} vues, {int(stats.get('videoCount', 0)):,} vidéos."
    ).replace(",", " ")

def _parse_calendar_start(text: str) -> datetime:
    now = datetime.now(timezone.utc)
    lower = _norm(text)
    day = now
    if "demain" in lower:
        day = now + timedelta(days=1)
    elif "apres-demain" in lower or "apres demain" in lower:
        day = now + timedelta(days=2)
    hour = 9
    minute = 0
    m = re.search(r"\b([01]?\d|2[0-3])\s*[h:]\s*([0-5]\d)?\b", lower)
    if m:
        hour = int(m.group(1))
        minute = int(m.group(2) or 0)
    return day.replace(hour=hour, minute=minute, second=0, microsecond=0)

async def _calendar_reminder(uid: str, description: str) -> str:
    token = await _google_token(uid, "Calendar")
    if not token:
        return _google_connect_message("Calendar")
    start = _parse_calendar_start(description)
    end = start + timedelta(minutes=30)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    body = {
        "summary": description[:120] or "Rappel Jarvis",
        "description": "Rappel créé depuis Telegram via Jarvis.",
        "start": {"dateTime": start.isoformat()},
        "end": {"dateTime": end.isoformat()},
        "reminders": {"useDefault": False, "overrides": [{"method": "popup", "minutes": 10}]},
    }
    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.post("https://www.googleapis.com/calendar/v3/calendars/primary/events", headers=headers, json=body)
    if r.status_code >= 400:
        return f"Google Calendar a répondu avec une erreur : {r.text[:300]}"
    link = r.json().get("htmlLink", "")
    return f"Rappel ajouté le {start.strftime('%d/%m/%Y à %H:%M')} UTC. {link}".strip()

async def handle_telegram_intent(text: str, uid: str, chat_id: str, callbacks: IntentCallbacks) -> bool:
    """Detects high-confidence Telegram natural-language intents and launches work asynchronously."""
    normalized = _norm(text)

    async def launch(title: str, start_message: str, job: Callable[[], Awaitable[str]]) -> bool:
        await send_telegram_message(chat_id, start_message)
        import asyncio
        asyncio.create_task(_run_background(chat_id, title, job))
        return True

    if "deep research" in normalized or "recherche approfondie" in normalized:
        subject = _after(text, [r"deep research sur", r"recherche approfondie sur"])
        cb = callbacks.get("deep_research")
        if not cb:
            return False
        return await launch("Deep research", f"🔎 Je lance le deep research sur : {subject}", lambda: cb(subject))

    if re.search(r"\b(cree|developpe|code|build|fais)\b.*\b(appli|app|application|site)\b", normalized):
        description = _after(text, [r"(cree|developpe|code|build)( moi)? une? (appli|app|application|site)", r"fais moi une? (appli|app|application|site)", r"lance un build"])
        cb = callbacks.get("start_builder")
        if not cb:
            return False
        return await launch("Build", f"🚀 Je lance la création de l'app : {description}", lambda: cb(description))

    if ("google sheet" in normalized or "spreadsheet" in normalized) and any(x in normalized for x in ["cree", "crée", "nouveau"]):
        description = _after(text, [r"(cree|crée) un google sheet", r"(cree|crée) une feuille google", r"(cree|crée) un spreadsheet"])
        if not await _google_token(uid, "Drive"):
            await send_telegram_message(chat_id, _google_connect_message("Drive"))
            return True
        return await launch("Google Sheet", f"📊 Je lance la création du Google Sheet : {description or 'nouveau fichier'}", lambda: _create_google_sheet(uid, description))

    if "supprime" in normalized and "spam" in normalized:
        if not await _google_token(uid, "Gmail"):
            await send_telegram_message(chat_id, _google_connect_message("Gmail"))
            return True
        return await launch("Nettoyage Gmail", "🧹 Je lance le nettoyage de tes spams Gmail.", lambda: _gmail_cleanup_spam(uid))

    if any(x in normalized for x in ["range mes mails", "range mes emails", "organise mes mails", "classe mes mails"]):
        if not await _google_token(uid, "Gmail"):
            await send_telegram_message(chat_id, _google_connect_message("Gmail"))
            return True
        return await launch("Rangement Gmail", "📬 Je lance le tri et la catégorisation de tes mails.", lambda: _gmail_organize(uid))

    if any(x in normalized for x in ["reponds a mes mails", "repond a mes mails", "reponds a mes emails", "repond a mes emails"]):
        instructions = _after(text, [r"reponds? a mes (mails|emails)"])
        if not await _google_token(uid, "Gmail"):
            await send_telegram_message(chat_id, _google_connect_message("Gmail"))
            return True
        return await launch("Réponses Gmail", "✍️ Je prépare des brouillons de réponses dans Gmail.", lambda: _gmail_draft_replies(uid, instructions, callbacks))

    if "youtube" in normalized and any(x in normalized for x in ["stats", "statistiques", "chaine", "chaîne"]):
        if not await _google_token(uid, "YouTube"):
            await send_telegram_message(chat_id, _google_connect_message("YouTube"))
            return True
        return await launch("Stats YouTube", "📈 Je récupère les stats de ta chaîne YouTube.", lambda: _youtube_stats(uid))

    if ("rappel" in normalized or "reminder" in normalized) and any(x in normalized for x in ["ajoute", "cree", "crée", "mets"]):
        description = _after(text, [r"(ajoute|cree|mets) un rappel", r"(ajoute|cree|mets) une alerte"])
        if not await _google_token(uid, "Calendar"):
            await send_telegram_message(chat_id, _google_connect_message("Calendar"))
            return True
        return await launch("Rappel Calendar", f"🗓️ Je crée le rappel : {description}", lambda: _calendar_reminder(uid, description))

    if any(x in normalized for x in ["ou en est mon build", "où en est mon build", "statut de mon build", "avancement de mon build"]):
        cb = callbacks.get("builder_status")
        if not cb:
            return False
        return await launch("Statut du build", "🔄 Je vérifie l'avancement de ton build.", lambda: cb())

    if any(x in normalized for x in ["mes projets", "liste mes projets", "affiche mes projets"]):
        cb = callbacks.get("list_projects")
        if not cb:
            return False
        return await launch("Liste des projets", "📁 Je récupère tes projets.", lambda: cb())

    return False
