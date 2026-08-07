from unittest.mock import MagicMock, patch

import pytest
from langchain_core.runnables import RunnableLambda

from apps.ai_engine import schemas
from apps.ai_engine import services as ai_services
from apps.interviews.models import PERSONALITY_PROFILES, AnswerEvaluation, InterviewAnswer, InterviewQuestion
from apps.monitoring.models import ProctoringEvent
from apps.resumes.models import ResumeInsight, ResumeSkill
from tests.mocks import make_fake_chat_model

pytestmark = pytest.mark.django_db


class TestExtractResumeEntities:
    def test_persists_skills_and_insight(self, resume):
        result = schemas.ResumeExtractionResult(
            summary="Backend engineer.",
            skills=[schemas.ExtractedSkill(name="Python", category="technical")],
            projects=[],
            experiences=[],
            education=[],
            certifications=[],
            strengths=["Strong fundamentals"],
            weaknesses=["Limited scale experience"],
            suggested_focus_areas=["System design"],
        )
        fake_model = make_fake_chat_model((schemas.ResumeExtractionResult, result))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            ai_services.extract_resume_entities(resume)

        assert ResumeSkill.objects.filter(resume=resume, name="Python").exists()
        insight = ResumeInsight.objects.get(resume=resume)
        assert insight.strengths == ["Strong fundamentals"]

    def test_raises_without_raw_text(self, resume):
        resume.raw_text = ""
        resume.save()

        with pytest.raises(ValueError, match="no extracted text"):
            ai_services.extract_resume_entities(resume)


class TestGenerateQuestionBank:
    def test_persists_ordered_questions(self, interview_session):
        result = schemas.QuestionBankResult(
            questions=[
                schemas.GeneratedQuestion(question_text="Q1", question_type="behavioral", difficulty="easy"),
                schemas.GeneratedQuestion(question_text="Q2", question_type="coding", difficulty="hard"),
            ]
        )
        fake_model = make_fake_chat_model((schemas.QuestionBankResult, result))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            ai_services.generate_question_bank(session=interview_session)

        questions = list(InterviewQuestion.objects.filter(session=interview_session).order_by("order_index"))
        assert [q.question_text for q in questions] == ["Q1", "Q2"]
        assert questions[0].order_index == 0
        assert questions[1].order_index == 1

    def test_personality_override_replaces_avatar_defaults_in_prompt(self, interview_session, avatar):
        avatar.interview_style = "avatar's own default style"
        avatar.speaking_style = "avatar's own default speaking style"
        avatar.difficulty = "easy"
        avatar.save()
        interview_session.personality = interview_session.Personality.STRICT_HR
        interview_session.save()

        rendered_prompts = []
        result = schemas.QuestionBankResult(
            questions=[schemas.GeneratedQuestion(question_text="Q", question_type="behavioral", difficulty="hard")]
        )
        fake_model = MagicMock()
        # (prompt | model).invoke(input) pipes a rendered ChatPromptValue into
        # the model, not the raw input dict -- capture its text to verify
        # which style/difficulty actually made it into the prompt.
        fake_model.with_structured_output.side_effect = lambda schema_cls: RunnableLambda(
            lambda prompt_value: rendered_prompts.append(prompt_value.to_string()) or result
        )

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            ai_services.generate_question_bank(session=interview_session)

        expected = PERSONALITY_PROFILES[interview_session.Personality.STRICT_HR]
        rendered = rendered_prompts[0]
        assert expected["interview_style"] in rendered
        assert expected["speaking_style"] in rendered
        assert expected["difficulty"] in rendered
        assert "avatar's own default style" not in rendered

    def test_falls_back_to_avatar_defaults_when_no_personality_chosen(self, interview_session, avatar):
        avatar.interview_style = "avatar's own default style"
        avatar.difficulty = "easy"
        avatar.save()
        assert interview_session.personality == ""

        rendered_prompts = []
        result = schemas.QuestionBankResult(
            questions=[schemas.GeneratedQuestion(question_text="Q", question_type="behavioral", difficulty="easy")]
        )
        fake_model = MagicMock()
        fake_model.with_structured_output.side_effect = lambda schema_cls: RunnableLambda(
            lambda prompt_value: rendered_prompts.append(prompt_value.to_string()) or result
        )

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            ai_services.generate_question_bank(session=interview_session)

        assert "avatar's own default style" in rendered_prompts[0]


class TestEvaluateAnswer:
    def test_persists_evaluation(self, interview_session, make_question):
        question = make_question(interview_session)
        answer = InterviewAnswer.objects.create(question=question, transcript_text="My answer.")
        result = schemas.AnswerEvaluationResult(
            technical_score=80, communication_score=75, relevance_score=90, confidence_score=70,
            voice_clarity_score=80, grammar_score=85, problem_solving_score=75,
            feedback="Good.", follow_up_question=None,
        )
        fake_model = make_fake_chat_model((schemas.AnswerEvaluationResult, result))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            outcome = ai_services.evaluate_answer(question=question, answer=answer)

        evaluation = AnswerEvaluation.objects.get(answer=answer)
        assert float(evaluation.technical_score) == 80.0
        assert float(evaluation.voice_clarity_score) == 80.0
        assert float(evaluation.grammar_score) == 85.0
        assert float(evaluation.problem_solving_score) == 75.0
        assert outcome["follow_up_question"] is None

    def test_creates_follow_up_for_top_level_question(self, interview_session, make_question):
        question = make_question(interview_session)
        answer = InterviewAnswer.objects.create(question=question, transcript_text="Vague answer.")
        result = schemas.AnswerEvaluationResult(
            technical_score=50, communication_score=50, relevance_score=50, confidence_score=50,
            voice_clarity_score=50, grammar_score=50, problem_solving_score=50,
            feedback="Needs more detail.", follow_up_question="Can you elaborate?",
        )
        fake_model = make_fake_chat_model((schemas.AnswerEvaluationResult, result))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            outcome = ai_services.evaluate_answer(question=question, answer=answer)

        follow_up = outcome["follow_up_question"]
        assert follow_up is not None
        assert follow_up.parent_question_id == question.id
        assert follow_up.question_type == InterviewQuestion.QuestionType.FOLLOW_UP

    def test_does_not_create_follow_up_for_a_follow_up(self, interview_session, make_question):
        parent = make_question(interview_session)
        follow_up_question = make_question(
            interview_session, parent_question=parent, question_type=InterviewQuestion.QuestionType.FOLLOW_UP
        )
        answer = InterviewAnswer.objects.create(question=follow_up_question, transcript_text="Still vague.")
        result = schemas.AnswerEvaluationResult(
            technical_score=40, communication_score=40, relevance_score=40, confidence_score=40,
            voice_clarity_score=40, grammar_score=40, problem_solving_score=40,
            feedback="Still thin.", follow_up_question="Another follow-up?",
        )
        fake_model = make_fake_chat_model((schemas.AnswerEvaluationResult, result))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            outcome = ai_services.evaluate_answer(question=follow_up_question, answer=answer)

        assert outcome["follow_up_question"] is None


class TestAggregateSessionReport:
    def test_raises_without_evaluated_answers(self, interview_session):
        with pytest.raises(ValueError, match="No evaluated answers"):
            ai_services.aggregate_session_report(session=interview_session)

    def test_derives_proctoring_scores_and_uses_llm_only_for_summary(self, interview_session, make_question):
        question = make_question(interview_session, question_type=InterviewQuestion.QuestionType.RESUME_BASED)
        answer = InterviewAnswer.objects.create(question=question, transcript_text="Answer.")
        AnswerEvaluation.objects.create(
            answer=answer, technical_score=80, communication_score=70, relevance_score=90, confidence_score=60
        )
        ProctoringEvent.objects.create(
            session=interview_session, event_type=ProctoringEvent.EventType.LOOKING_AWAY,
            severity=ProctoringEvent.Severity.WARNING,
        )

        summary = schemas.ReportSummaryResult(
            strengths=["Clear"], weaknesses=["Verbose"], improvement_tips=["Be concise"]
        )
        fake_model = make_fake_chat_model((schemas.ReportSummaryResult, summary))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            report_data = ai_services.aggregate_session_report(session=interview_session)

        assert report_data["technical_score"] == 80.0
        assert report_data["eye_contact_score"] == 95.0  # 100 - 1 looking_away * 5
        assert report_data["body_language_score"] == 100.0  # no body-language events
        assert report_data["resume_matching_score"] == 90.0  # from the resume_based question's relevance
        assert report_data["strengths"] == ["Clear"]
        # overall now averages across all 9 dimensions, not just the original 6:
        # (80 + 70 + 60 + 100 + 95 + 90 + 0 + 0 + 0) / 9 -- voice_clarity/grammar/
        # problem_solving default to 0 here since this AnswerEvaluation was
        # created directly rather than through evaluate_answer().
        assert report_data["overall_score"] == 55.0

    def test_aggregates_voice_clarity_grammar_and_problem_solving_scores(
        self, interview_session, make_question
    ):
        question = make_question(interview_session)
        answer = InterviewAnswer.objects.create(question=question, transcript_text="Answer.")
        AnswerEvaluation.objects.create(
            answer=answer,
            technical_score=80, communication_score=70, relevance_score=90, confidence_score=60,
            voice_clarity_score=88, grammar_score=92, problem_solving_score=76,
        )

        summary = schemas.ReportSummaryResult(strengths=[], weaknesses=[], improvement_tips=[])
        fake_model = make_fake_chat_model((schemas.ReportSummaryResult, summary))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            report_data = ai_services.aggregate_session_report(session=interview_session)

        assert report_data["voice_clarity_score"] == 88.0
        assert report_data["grammar_score"] == 92.0
        assert report_data["problem_solving_score"] == 76.0

    def test_passes_through_hiring_recommendation_and_recommendations(self, interview_session, make_question):
        question = make_question(interview_session)
        answer = InterviewAnswer.objects.create(question=question, transcript_text="Answer.")
        AnswerEvaluation.objects.create(
            answer=answer, technical_score=80, communication_score=70, relevance_score=90, confidence_score=60
        )

        summary = schemas.ReportSummaryResult(
            strengths=[],
            weaknesses=[],
            improvement_tips=[],
            hiring_recommendation="hire",
            hiring_recommendation_reason="Solid technical fundamentals with clear communication.",
            recommended_courses=["Advanced SQL"],
            recommended_certifications=["AWS Certified Developer"],
            recommended_projects=["Build a rate-limited REST API"],
        )
        fake_model = make_fake_chat_model((schemas.ReportSummaryResult, summary))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            report_data = ai_services.aggregate_session_report(session=interview_session)

        assert report_data["hiring_recommendation"] == "hire"
        assert report_data["hiring_recommendation_reason"] == "Solid technical fundamentals with clear communication."
        assert report_data["recommended_courses"] == ["Advanced SQL"]
        assert report_data["recommended_certifications"] == ["AWS Certified Developer"]
        assert report_data["recommended_projects"] == ["Build a rate-limited REST API"]

    def test_passes_through_spoken_summary_roadmap_and_career_suggestions(
        self, interview_session, make_question
    ):
        question = make_question(interview_session, question_type=InterviewQuestion.QuestionType.RESUME_BASED)
        answer = InterviewAnswer.objects.create(question=question, transcript_text="Answer.")
        AnswerEvaluation.objects.create(
            answer=answer, technical_score=80, communication_score=70, relevance_score=90, confidence_score=60
        )

        summary = schemas.ReportSummaryResult(
            strengths=["Clear"],
            weaknesses=["Verbose"],
            improvement_tips=["Be concise"],
            spoken_summary="Thanks for your time today -- you showed strong Python fundamentals.",
            learning_roadmap=["Practice system design fundamentals"],
            career_suggestions=["Backend Developer roles"],
        )
        fake_model = make_fake_chat_model((schemas.ReportSummaryResult, summary))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            report_data = ai_services.aggregate_session_report(session=interview_session)

        assert report_data["spoken_summary"].startswith("Thanks for your time today")
        assert report_data["learning_roadmap"] == ["Practice system design fundamentals"]
        assert report_data["career_suggestions"] == ["Backend Developer roles"]


class TestModerateText:
    def test_returns_safe_result_unchanged(self):
        result = schemas.ModerationResult(is_safe=True, reason="")
        fake_model = make_fake_chat_model((schemas.ModerationResult, result))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            outcome = ai_services.moderate_text("Tell me about your experience with Django.")

        assert outcome.is_safe is True

    def test_flags_unsafe_text(self):
        result = schemas.ModerationResult(is_safe=False, reason="Contains abusive language.")
        fake_model = make_fake_chat_model((schemas.ModerationResult, result))

        with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
            outcome = ai_services.moderate_text("some disallowed content")

        assert outcome.is_safe is False
        assert outcome.reason == "Contains abusive language."
