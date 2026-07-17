"""factory_boy factories shared across the test suite.

Kept in one place (rather than per-app) since fixtures like avatar/student
are used across app boundaries constantly (e.g. an interview test needs a
student, an avatar, and sometimes a resume).
"""
import factory
from django.core.files.base import ContentFile

from apps.avatars.models import Avatar, CustomAvatar
from apps.interviews.models import InterviewQuestion, InterviewSession
from apps.resumes.models import Resume
from apps.users.models import StudentProfile, User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    full_name = factory.Faker("name")
    is_email_verified = True
    password = factory.PostGenerationMethodCall("set_password", "TestPass123!")


class StudentProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = StudentProfile

    user = factory.SubFactory(UserFactory)


class AvatarFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Avatar

    name = factory.Faker("name")
    category = Avatar.Category.HR_MANAGER
    difficulty = Avatar.Difficulty.MEDIUM
    voice_map = factory.LazyFunction(lambda: {"en": "en-US-JennyNeural", "hi": "hi-IN-SwaraNeural"})
    supported_languages = factory.LazyFunction(lambda: ["en", "hi", "te"])
    is_active = True

    @factory.lazy_attribute
    def image(self):
        return ContentFile(b"fake-image-bytes", name="avatar.png")


def _generate_valid_png() -> bytes:
    """A real, decodable (if faceless) PNG -- needed because
    CustomAvatarFactory's source_photo goes through actual cv2.imdecode()
    in tests that exercise the real face-detection pipeline."""
    import io

    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (200, 200), (120, 120, 200)).save(buffer, format="PNG")
    return buffer.getvalue()


class CustomAvatarFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CustomAvatar

    student = factory.SubFactory(StudentProfileFactory)
    status = CustomAvatar.Status.PENDING

    @factory.lazy_attribute
    def source_photo(self):
        return ContentFile(_generate_valid_png(), name="source.png")


class ResumeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Resume

    student = factory.SubFactory(StudentProfileFactory)
    original_filename = "resume.pdf"
    file_type = Resume.FileType.PDF
    parsing_status = Resume.ParsingStatus.COMPLETED
    raw_text = "Jane Doe. Software Engineer. Skills: Python, Django."
    is_active = True

    @factory.lazy_attribute
    def file(self):
        return ContentFile(b"%PDF-1.4 fake", name="resume.pdf")


class InterviewSessionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = InterviewSession

    student = factory.SubFactory(StudentProfileFactory)
    avatar = factory.SubFactory(AvatarFactory)
    language = InterviewSession.Language.ENGLISH
    status = InterviewSession.Status.IN_PROGRESS


class InterviewQuestionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = InterviewQuestion

    session = factory.SubFactory(InterviewSessionFactory)
    question_text = factory.Faker("sentence")
    question_type = InterviewQuestion.QuestionType.BEHAVIORAL
    difficulty = InterviewQuestion.Difficulty.MEDIUM
    order_index = factory.Sequence(lambda n: n)
