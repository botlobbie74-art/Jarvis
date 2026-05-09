import httpx
import logging

log = logging.getLogger("jarvis.skills.youtube")

async def generate_replies(channel_id: str, video_id: str, user_style: str) -> list:
    """
    Appelle l'API de smartermax.app en passant le YouTube channel ID et le style de l'utilisateur.
    Retourne les réponses générées.
    """
    url = "https://smartermax.app/api/youtube/generate-replies"
    payload = {
        "channel_id": channel_id,
        "video_id": video_id,
        "user_style": user_style
    }
    try:
        # In a real scenario, you'd send an actual request.
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(url, json=payload, timeout=30.0)
        #     return response.json().get("replies", [])
        
        # Mocking the response for development
        return [
            {"comment_id": "c1", "reply": f"Super retour, merci ! {user_style}"},
            {"comment_id": "c2", "reply": f"Excellente question, je vais y répondre bientôt. {user_style}"}
        ]
    except Exception as e:
        log.error(f"Erreur API smartermax.app: {e}")
        return []
