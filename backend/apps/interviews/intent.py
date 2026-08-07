"""Fast, deterministic detection of two conversational intents in a
candidate's answer text: "I don't know" and "skip this question". Regex/
keyword matching rather than an LLM call -- these need to feel instant
(no round-trip latency mid-answer) and the phrase set is small and
well-defined, so a classifier call would be slower and costlier for no
real accuracy gain.

Both checks are deliberately scoped to short answers: a substantive answer
that hedges mid-explanation ("I don't know if this is the best approach,
but...") must not be misdetected as a bail-out, so matching requires the
whole (short) message to be essentially just the phrase, not any answer
that happens to contain it.
"""
import re

_MAX_WORDS = 6

_DONT_KNOW_PHRASES = [
    "i don't know this answer",
    "i dont know this answer",
    "i don't know this",
    "i dont know this",
    "i don't know",
    "i dont know",
    "i do not know",
    "sorry i don't know",
    "sorry i dont know",
    "i have no idea",
    "no idea",
    "i forgot",
    "i can't answer",
    "i cant answer",
    "i can't answer this",
    "not sure",
    "i'm not sure",
    "i am not sure",
    "no clue",
]

# Bare single words ("skip", "next") only count if they're the *entire*
# message -- as a substring they're too common in genuine answers
# ("next month I start...") to use as a reliable signal.
_SKIP_EXACT_PHRASES = {"skip", "next"}
_SKIP_CONTAINED_PHRASES = [
    "next question",
    "skip this question",
    "skip question",
    "skip this",
    "move on",
    "let's move on",
    "lets move on",
    "go to next",
    "go to the next",
]


def _normalize(text: str) -> str:
    return re.sub(r"[^\w\s']", " ", text.lower()).strip()


def _short_phrase_match(normalized: str, phrases: list[str]) -> bool:
    words = normalized.split()
    if not words or len(words) > _MAX_WORDS:
        return False
    return any(phrase in normalized for phrase in phrases)


def is_dont_know(text: str) -> bool:
    """True if a short answer is effectively "I don't know"."""
    return _short_phrase_match(_normalize(text), _DONT_KNOW_PHRASES)


def is_skip_request(text: str) -> bool:
    """True if a short answer is effectively "skip this question"."""
    normalized = _normalize(text)
    if normalized in _SKIP_EXACT_PHRASES:
        return True
    return _short_phrase_match(normalized, _SKIP_CONTAINED_PHRASES)
