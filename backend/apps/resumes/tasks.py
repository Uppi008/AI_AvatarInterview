import logging

from celery import shared_task

from .models import Resume

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def parse_resume_task(self, *, resume_id: str):
    """Extracts raw text from the uploaded PDF/DOCX and hands off to the AI
    engine for structured extraction (skills/projects/experience/...).

    Structured extraction and question-bank generation are implemented in
    Phase 5 (apps.ai_engine); until then this task only performs the
    deterministic text-extraction step and leaves the resume in
    `COMPLETED` state with `raw_text` populated.
    """
    resume = Resume.objects.get(id=resume_id)
    resume.parsing_status = Resume.ParsingStatus.PROCESSING
    resume.save(update_fields=["parsing_status"])

    try:
        resume.raw_text = _extract_text(resume)
        resume.parsing_status = Resume.ParsingStatus.COMPLETED
        resume.save(update_fields=["raw_text", "parsing_status"])
    except Exception as exc:
        resume.parsing_status = Resume.ParsingStatus.FAILED
        resume.parsing_error = str(exc)
        resume.save(update_fields=["parsing_status", "parsing_error"])
        raise

    from apps.ai_engine.services import extract_resume_entities

    try:
        extract_resume_entities(resume)
    except NotImplementedError:
        logger.info("Structured resume extraction for %s awaits Phase 5.", resume_id)


def _extract_text(resume: Resume) -> str:
    resume.file.open("rb")
    try:
        if resume.file_type == Resume.FileType.PDF:
            from pypdf import PdfReader

            reader = PdfReader(resume.file)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            import docx

            document = docx.Document(resume.file)
            return "\n".join(paragraph.text for paragraph in document.paragraphs)
    finally:
        resume.file.close()
