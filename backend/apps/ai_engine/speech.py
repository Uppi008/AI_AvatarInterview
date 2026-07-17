"""Speech integration: text-to-speech (edge-tts) and speech-to-text (Groq's
hosted Whisper endpoint). Same integration-boundary rule as services.py --
nothing outside apps.ai_engine talks to edge-tts or Groq's audio API
directly, so swapping either provider touches only this file.
"""
import base64
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


async def synthesize_speech(text: str, voice: str) -> str:
    """Returns base64-encoded MP3 audio for `text` spoken in `voice` (an
    edge-tts voice ID, e.g. 'en-US-JennyNeural')."""
    import edge_tts

    communicate = edge_tts.Communicate(text, voice)
    audio_chunks = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.extend(chunk["data"])

    if not audio_chunks:
        raise RuntimeError(f"edge-tts returned no audio for voice '{voice}'.")

    return base64.b64encode(bytes(audio_chunks)).decode("ascii")


async def transcribe_speech(audio_bytes: bytes, *, filename: str = "answer.webm", language: str = "en") -> str:
    """Transcribes recorded answer audio via Groq's hosted Whisper endpoint."""
    from groq import AsyncGroq

    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured. Set it in .env before using AI features.")

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    transcription = await client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model="whisper-large-v3",
        language=language,
        response_format="text",
    )
    # response_format="text" returns a plain string on current SDK versions;
    # guard against an object-with-.text response shape on older ones.
    return transcription if isinstance(transcription, str) else transcription.text
