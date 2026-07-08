import os

os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-more-than-32-characters-for-testing")
os.environ.setdefault("CORS_ORIGINS", "http://testserver")
os.environ.setdefault("DEBUG", "False")
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DB_AUTO_CREATE", "True")
os.environ.setdefault("SEED_DEMO_DATA", "True")

import pytest
from fastapi.testclient import TestClient

from database import SessionLocal, create_schema
from main import app
from seed_data import ensure_initial_data
from db_models import User


create_schema()
with SessionLocal() as db:
    ensure_initial_data(db)

client = TestClient(app)


def auth_headers(identifier="9876543210", password="password123"):
    r = client.post("/api/v1/auth/login", json={"phone_or_email": identifier, "password": password})
    assert r.status_code == 200, r.json()
    return {"Authorization": f"Bearer {r.json()['token']}"}


class TestAccountLockout:
    def test_lockout_after_failed_attempts(self):
        for _ in range(5):
            r = client.post("/api/v1/auth/login", json={
                "phone_or_email": "9876543210", "password": "wrongpassword"
            })
            assert r.status_code == 401

        r = client.post("/api/v1/auth/login", json={
            "phone_or_email": "9876543210", "password": "wrongpassword"
        })
        assert r.status_code == 429
        assert "locked" in r.json()["detail"].lower()

    def test_successful_login_resets_lockout(self):
        with SessionLocal() as db:
            user = db.query(User).filter(User.phone == "9876543210").first()
            if user:
                user.failed_login_attempts = 5
                from datetime import datetime, timedelta, timezone
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
                db.commit()

        r = client.post("/api/v1/auth/login", json={
            "phone_or_email": "9876543210", "password": "password123"
        })
        assert r.status_code == 200


class TestAuditLogging:
    def test_login_creates_audit_log(self):
        from db_models import AuditLog
        with SessionLocal() as db:
            before = db.query(AuditLog).filter(AuditLog.action == "login").count()

        auth_headers()

        with SessionLocal() as db:
            after = db.query(AuditLog).filter(AuditLog.action == "login").count()
        assert after > before


class TestTokenExpiry:
    def test_token_expiry_default(self):
        from settings import settings
        assert settings.access_token_expire_days <= 1
        assert settings.refresh_token_expire_days <= 7


class TestRateLimiting:
    def test_rate_limit_on_login(self):
        for _ in range(12):
            r = client.post("/api/v1/auth/login", json={
                "phone_or_email": "nonexistent@test.com", "password": "test"
            })
        assert r.status_code == 429
