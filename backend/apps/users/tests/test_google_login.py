"""Google sign-in: verification, clock leeway, and user-facing error reasons."""
from unittest.mock import patch

import pytest

from apps.users.models import SocialAccount, StudentProfile, User
from tests.factories import UserFactory

pytestmark = pytest.mark.django_db

URL = "/api/v1/auth/google/"
CLIENT_ID = "123-test.apps.googleusercontent.com"
VERIFY = "google.oauth2.id_token.verify_oauth2_token"
PAYLOAD = {"sub": "google-uid-1", "email": "new.person@gmail.com", "email_verified": True, "name": "New Person"}


def _error(response):
    return response.data["error"]["detail"]


class TestGoogleLogin:
    @pytest.fixture(autouse=True)
    def _client_id(self, settings):
        settings.GOOGLE_OAUTH_CLIENT_ID = CLIENT_ID

    def test_creates_user_profile_and_link_and_returns_tokens(self, api_client):
        with patch(VERIFY, return_value=PAYLOAD) as verify:
            response = api_client.post(URL, {"id_token": "tok"}, format="json")

        assert response.status_code == 200
        assert response.data["access"] and response.data["refresh"]
        user = User.objects.get(email="new.person@gmail.com")
        assert StudentProfile.objects.filter(user=user).exists()
        assert SocialAccount.objects.filter(user=user, provider_uid="google-uid-1").exists()
        # Verified against our client ID, with leeway for a slightly-off PC clock.
        assert verify.call_args.args[2] == CLIENT_ID
        assert verify.call_args.kwargs["clock_skew_in_seconds"] == 300

    def test_existing_password_account_is_linked_not_duplicated(self, api_client):
        existing = UserFactory(email="new.person@gmail.com")
        with patch(VERIFY, return_value=PAYLOAD):
            response = api_client.post(URL, {"id_token": "tok"}, format="json")

        assert response.status_code == 200
        assert User.objects.filter(email="new.person@gmail.com").count() == 1
        assert SocialAccount.objects.get(provider_uid="google-uid-1").user == existing

    def test_unverified_google_email_is_rejected(self, api_client):
        with patch(VERIFY, return_value={**PAYLOAD, "email_verified": False}):
            response = api_client.post(URL, {"id_token": "tok"}, format="json")

        assert response.status_code == 400
        assert "verified" in _error(response)
        assert not User.objects.filter(email="new.person@gmail.com").exists()

    @pytest.mark.parametrize(
        "reason, expected",
        [
            ("Token has wrong audience 999, expected one of ['123']", "different app"),
            ("Token used too early, 100 < 105. Check that your computer's clock is set correctly.", "clock"),
            ("Wrong number of segments in token", "couldn't be verified"),
        ],
    )
    def test_rejections_explain_the_cause(self, api_client, reason, expected):
        with patch(VERIFY, side_effect=ValueError(reason)):
            response = api_client.post(URL, {"id_token": "tok"}, format="json")

        assert response.status_code == 400
        assert expected in _error(response)


def test_missing_server_client_id_says_so(api_client, settings):
    settings.GOOGLE_OAUTH_CLIENT_ID = ""
    response = api_client.post(URL, {"id_token": "tok"}, format="json")

    assert response.status_code == 400
    assert "GOOGLE_OAUTH_CLIENT_ID" in _error(response)
