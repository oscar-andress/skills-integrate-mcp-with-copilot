# Mergington High School Activities API

A simple FastAPI application for viewing extracurricular activities and managing student registrations.

## Features

- View all available extracurricular activities
- Teacher-only student registration and unregistration
- Teacher login with signed sessions

## Getting Started

1. Install the dependencies from the repository root:

   ```
   pip install -r requirements.txt
   ```

2. Configure teacher credentials and a stable session signing secret in the server environment. Do not commit credentials or secrets to the repository:

   ```
   export TEACHER_USERNAME="teacher-username"
   export TEACHER_PASSWORD="a-unique-teacher-password"
   export SESSION_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
   ```

   For an HTTPS deployment, also set `SESSION_HTTPS_ONLY=true`. Keep the same `SESSION_SECRET` across server restarts and workers.

3. Start the application from the repository root:

   ```
   uvicorn src.app:app --reload
   ```

4. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                            | Description |
| ------ | ------------------------------------------------------------------- | ----------- |
| GET    | `/activities`                                                       | Get all activities and current participants |
| GET    | `/auth/session`                                                     | Check the current teacher login |
| POST   | `/auth/login`                                                       | Log in with the configured teacher credentials |
| POST   | `/auth/logout`                                                      | Log out and clear the session |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu`   | Register a student (teacher login required) |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Unregister a student (teacher login required) |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

Activity data is stored in memory, which means registrations are reset when the server restarts.
