import pytest

from apps.interviews.intent import is_dont_know, is_skip_request


class TestIsDontKnow:
    @pytest.mark.parametrize(
        "text",
        [
            "I don't know.",
            "I don't know this answer.",
            "Sorry, I don't know.",
            "I have no idea.",
            "I forgot.",
            "I can't answer.",
            "No idea",
            "i dont know",
            "  I'M NOT SURE  ",
        ],
    )
    def test_detects_dont_know_variants(self, text):
        assert is_dont_know(text) is True

    def test_does_not_misdetect_a_hedge_inside_a_real_answer(self):
        answer = (
            "I don't know if this is the most optimal approach, but I would use a hash map "
            "to store the frequency counts and then iterate through it to find the answer."
        )
        assert is_dont_know(answer) is False

    def test_does_not_flag_unrelated_short_answer(self):
        assert is_dont_know("Django REST Framework") is False

    def test_empty_text_is_not_flagged(self):
        assert is_dont_know("") is False


class TestIsSkipRequest:
    @pytest.mark.parametrize(
        "text",
        ["Next Question", "Skip", "Move on", "Go to next", "Next", "skip this question", "Let's move on"],
    )
    def test_detects_skip_variants(self, text):
        assert is_skip_request(text) is True

    def test_bare_next_as_whole_message_is_a_skip(self):
        assert is_skip_request("next") is True

    def test_next_inside_a_real_answer_is_not_a_skip(self):
        assert is_skip_request("Next month I start my new job as a backend developer.") is False

    def test_skip_word_inside_a_real_answer_is_not_a_skip(self):
        answer = "You can skip validation here if the input is already sanitized upstream."
        assert is_skip_request(answer) is False

    def test_empty_text_is_not_flagged(self):
        assert is_skip_request("") is False
