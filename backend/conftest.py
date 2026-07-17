import pytest
from rest_framework.test import APIClient

from tests.factories import (
    AvatarFactory,
    CustomAvatarFactory,
    InterviewQuestionFactory,
    InterviewSessionFactory,
    ResumeFactory,
    StudentProfileFactory,
    UserFactory,
)


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def student(db):
    return StudentProfileFactory()


@pytest.fixture
def avatar(db):
    return AvatarFactory()


@pytest.fixture
def resume(db, student):
    return ResumeFactory(student=student)


@pytest.fixture
def custom_avatar(db, student):
    return CustomAvatarFactory(student=student)


@pytest.fixture
def interview_session(db, student, avatar):
    return InterviewSessionFactory(student=student, avatar=avatar)


@pytest.fixture
def make_question():
    def _make(session, **kwargs):
        return InterviewQuestionFactory(session=session, **kwargs)

    return _make


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, student):
    """An APIClient authenticated as `student`'s user via a real JWT, the
    same mechanism the frontend uses -- not force_authenticate, so tests
    also exercise the actual auth backend."""
    from rest_framework_simplejwt.tokens import RefreshToken

    token = RefreshToken.for_user(student.user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client
