"""Deterministic delivery analysis for a written or transcribed answer.

No LLM involved: filler words, length and pacing are countable, so they
are counted -- exact, free, and instant, unlike asking a model to guess.
"""
import re

# Multi-word fillers first so "you know" isn't also counted as nothing.
FILLERS = (
    "you know",
    "i mean",
    "kind of",
    "sort of",
    "um",
    "uh",
    "erm",
    "hmm",
    "like",
    "basically",
    "actually",
    "literally",
    "obviously",
    "totally",
)
# Average conversational interview pace.
WORDS_PER_MINUTE = 140
IDEAL_WORDS = (120, 300)  # ~1-2 minutes spoken
WORD_RE = re.compile(r"[\w']+", re.UNICODE)


def analyze_delivery(text: str) -> dict:
    lowered = text.lower()
    words = WORD_RE.findall(lowered)
    word_count = len(words)

    filler_counts: dict[str, int] = {}
    remaining = f" {' '.join(words)} "
    for filler in FILLERS:
        pattern = f" {filler} "
        count = remaining.count(pattern)
        if count:
            filler_counts[filler] = count
            remaining = remaining.replace(pattern, " ")
    filler_total = sum(filler_counts.values())

    sentences = [s for s in re.split(r"[.!?।]+", text) if WORD_RE.search(s)]
    avg_sentence_words = round(word_count / len(sentences), 1) if sentences else 0.0

    if word_count < IDEAL_WORDS[0]:
        length_verdict = "too_short"
    elif word_count > IDEAL_WORDS[1]:
        length_verdict = "too_long"
    else:
        length_verdict = "good"

    return {
        "word_count": word_count,
        "speaking_seconds": round(word_count / WORDS_PER_MINUTE * 60),
        "filler_count": filler_total,
        "filler_rate": round(filler_total / word_count * 100, 1) if word_count else 0.0,
        "fillers": dict(sorted(filler_counts.items(), key=lambda kv: -kv[1])),
        "avg_sentence_words": avg_sentence_words,
        "length_verdict": length_verdict,
        "uses_numbers": bool(re.search(r"\d", text)),
    }
