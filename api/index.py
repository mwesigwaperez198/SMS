import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

results = {}

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    results["pydantic_settings"] = "ok"
except Exception as e:
    results["pydantic_settings"] = str(e)

try:
    from pydantic import AnyHttpUrl, Field
    results["pydantic"] = "ok"
except Exception as e:
    results["pydantic"] = str(e)

try:
    from jose import JWTError, jwt
    results["jose"] = "ok"
except Exception as e:
    results["jose"] = str(e)

try:
    from passlib.context import CryptContext
    results["passlib"] = "ok"
except Exception as e:
    results["passlib"] = str(e)

try:
    from sqlalchemy import create_engine
    results["sqlalchemy"] = "ok"
except Exception as e:
    results["sqlalchemy"] = str(e)

try:
    from psycopg2 import connect
    results["psycopg2"] = "ok"
except Exception as e:
    results["psycopg2"] = str(e)

try:
    import bcrypt
    results["bcrypt"] = "ok"
except Exception as e:
    results["bcrypt"] = str(e)

from fastapi import FastAPI

app = FastAPI()

@app.get("/api/health")
async def health():
    return {"status": "ok", "imports": results}
