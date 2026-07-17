"""Shared LLM-mocking helpers for tests that exercise apps.ai_engine chains.

Uses a real langchain_core.runnables.RunnableLambda, not a bare MagicMock:
LangChain's `|` operator coerces anything callable into a RunnableLambda and
invokes it directly rather than calling `.invoke()` on it, and a plain
MagicMock is callable -- so a bare mock here would get silently wrapped and
return an unconfigured auto-mock instead of the canned result. Caught for
real while verifying Phase 5/7 by hand; kept here so every test benefits.
"""
from unittest.mock import MagicMock

from langchain_core.runnables import RunnableLambda


def make_fake_chat_model(*schema_to_result: tuple) -> MagicMock:
    """Builds a fake `get_chat_model` return value whose
    `.with_structured_output(SchemaCls)` yields the matching canned result.

    Usage: patch("apps.ai_engine.services.get_chat_model",
                  return_value=make_fake_chat_model((MySchema, my_result)))
    """
    mapping = dict(schema_to_result)
    fake_model = MagicMock()

    def with_structured_output(schema_cls):
        if schema_cls not in mapping:
            raise AssertionError(f"No fake result configured for schema {schema_cls}")
        return RunnableLambda(lambda _input: mapping[schema_cls])

    fake_model.with_structured_output.side_effect = with_structured_output
    return fake_model
