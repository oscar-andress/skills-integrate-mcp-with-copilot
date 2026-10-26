import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request

from src import app as app_module


def make_request(session=None):
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [],
            "query_string": b"",
            "session": session if session is not None else {},
        }
    )


class TeacherAuthenticationTests(unittest.TestCase):
    def test_login_requires_configured_credentials(self):
        request = make_request()
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as error:
                app_module.teacher_login(
                    app_module.TeacherCredentials(username="teacher", password="secret"),
                    request,
                )

        self.assertEqual(error.exception.status_code, 503)

    def test_login_rejects_invalid_credentials(self):
        request = make_request()
        with patch.dict(
            os.environ,
            {"TEACHER_USERNAME": "teacher", "TEACHER_PASSWORD": "correct"},
            clear=True,
        ):
            with self.assertRaises(HTTPException) as error:
                app_module.teacher_login(
                    app_module.TeacherCredentials(username="teacher", password="wrong"),
                    request,
                )

        self.assertEqual(error.exception.status_code, 401)
        self.assertNotIn("teacher", request.session)

    def test_teacher_can_log_in_and_manage_registrations(self):
        request = make_request()
        credentials = app_module.TeacherCredentials(
            username="teacher",
            password="correct",
        )
        activity_name = "Chess Club"
        email = "new-student@mergington.edu"
        with patch.dict(
            os.environ,
            {"TEACHER_USERNAME": "teacher", "TEACHER_PASSWORD": "correct"},
            clear=True,
        ):
            result = app_module.teacher_login(credentials, request)
        self.assertEqual(result["username"], "teacher")
        self.assertEqual(
            app_module.get_auth_session(request),
            {"authenticated": True, "username": "teacher"},
        )

        activity = app_module.activities[activity_name]
        self.addCleanup(
            lambda: activity["participants"].remove(email)
            if email in activity["participants"]
            else None
        )
        app_module.signup_for_activity(activity_name, email, request)
        self.assertIn(email, activity["participants"])
        app_module.unregister_from_activity(activity_name, email, request)
        self.assertNotIn(email, activity["participants"])

    def test_anonymous_users_cannot_change_registrations(self):
        request = make_request()
        with self.assertRaises(HTTPException) as signup_error:
            app_module.signup_for_activity("Chess Club", "student@example.com", request)
        with self.assertRaises(HTTPException) as unregister_error:
            app_module.unregister_from_activity(
                "Chess Club",
                "michael@mergington.edu",
                request,
            )

        self.assertEqual(signup_error.exception.status_code, 401)
        self.assertEqual(unregister_error.exception.status_code, 401)

    def test_logout_clears_teacher_session(self):
        request = make_request({"teacher": "teacher"})

        app_module.teacher_logout(request)

        self.assertEqual(app_module.get_auth_session(request), {
            "authenticated": False,
            "username": None,
        })


if __name__ == "__main__":
    unittest.main()
