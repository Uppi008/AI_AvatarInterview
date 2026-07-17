from .models import Resume


def upload_resume(*, student, file, original_filename: str, file_type: str) -> Resume:
    """Stores the upload, demotes any previously-active resume, and queues
    text extraction + (Phase 5) structured extraction."""
    Resume.objects.filter(student=student, is_active=True).update(is_active=False)
    resume = Resume.objects.create(
        student=student, file=file, original_filename=original_filename, file_type=file_type
    )

    from .tasks import parse_resume_task

    parse_resume_task.delay(resume_id=str(resume.id))
    return resume
