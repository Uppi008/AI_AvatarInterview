from apps.career.delivery import analyze_delivery


def test_counts_single_and_multi_word_fillers_once_each():
    stats = analyze_delivery("Um, so I basically, you know, built the API. Like, it was fast.")

    assert stats["fillers"] == {"um": 1, "basically": 1, "you know": 1, "like": 1}
    assert stats["filler_count"] == 4


def test_short_answer_is_flagged_and_pacing_estimated():
    stats = analyze_delivery("I fixed the bug in 2 days.")

    assert stats["word_count"] == 7
    assert stats["length_verdict"] == "too_short"
    assert stats["speaking_seconds"] == 3
    assert stats["uses_numbers"] is True


def test_empty_text_does_not_divide_by_zero():
    stats = analyze_delivery("")

    assert stats["word_count"] == 0
    assert stats["filler_rate"] == 0.0
    assert stats["avg_sentence_words"] == 0.0
