import os
import subprocess
import sys
from pathlib import Path

os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-more-than-32-characters")
os.environ.setdefault("CORS_ORIGINS", "http://testserver")
os.environ.setdefault("DEBUG", "False")
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DB_AUTO_CREATE", "True")
os.environ.setdefault("SEED_DEMO_DATA", "True")

from fastapi.testclient import TestClient

from database import SessionLocal, create_schema
from main import app
from seed_data import ensure_initial_data


create_schema()
with SessionLocal() as db:
    ensure_initial_data(db)

client = TestClient(app)
PROJECT_ROOT = Path(__file__).resolve().parents[1]


def auth_headers(identifier="9876543210", password="password123"):
    response = client.post(
        "/api/v1/auth/login",
        json={"phone_or_email": identifier, "password": password},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_health_check():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0"}


def test_readiness_check():
    response = client.get("/api/v1/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "version": "1.0.0"}


def test_protected_route_requires_bearer_token():
    response = client.get("/api/v1/student/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing bearer token"


def test_login_and_profile_flow():
    response = client.get("/api/v1/student/me", headers=auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "jeetendra@doon.edu.in"
    assert body["role"] == "student"


def test_admin_can_list_roles():
    response = client.get("/api/v1/roles", headers=auth_headers("schooladmin@novaadmin.kesug.com"))

    assert response.status_code == 200
    assert "teacher" in response.json()["roles"]
    assert "super_admin" in response.json()["roles"]


def test_student_cannot_list_users():
    response = client.get("/api/v1/admin/users", headers=auth_headers())

    assert response.status_code == 403


def test_invalid_login_is_rejected():
    response = client.post(
        "/api/v1/auth/login",
        json={"phone_or_email": "9876543210", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_invalid_month_is_rejected():
    response = client.get(
        "/api/v1/attendance?month=2025-13",
        headers=auth_headers(),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "month must be a valid YYYY-MM value"


def test_production_rejects_placeholder_secret():
    env = os.environ.copy()
    env.update(
        {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "replace-with-a-strong-random-secret-at-least-32-characters",
            "CORS_ORIGINS": "https://app.example.com",
        }
    )

    result = subprocess.run(
        [sys.executable, "-c", "import main"],
        cwd=PROJECT_ROOT,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "SECRET_KEY must be a strong random value in production" in result.stderr
