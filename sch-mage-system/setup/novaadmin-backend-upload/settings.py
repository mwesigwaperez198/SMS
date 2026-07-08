from dataclasses import dataclass
from typing import List, Optional
from urllib.parse import quote_plus

import os
from dotenv import load_dotenv


load_dotenv()


DEFAULT_DEV_SECRET_KEY = "dev-only-secret-change-me"
WEAK_SECRET_KEYS = {
    "",
    "your-secret-key-change-in-production",
    "your-secret-key-here",
    "replace-with-a-strong-random-secret-at-least-32-characters",
    "your-super-secret-key-change-in-production",
    "your-super-secret-key-change-this-in-production-use-strong-random-string",
}

DEFAULT_DEV_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]


def parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def parse_csv(value: Optional[str], default: Optional[List[str]] = None) -> List[str]:
    if not value:
        return default or []
    return [item.strip() for item in value.split(",") if item.strip()]


def get_int_env(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None or raw_value == "":
        return default
    try:
        return int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc


def first_env(*names: str, default: Optional[str] = None) -> Optional[str]:
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip() != "":
            return value.strip()
    return default


def normalize_database_url(url: str) -> str:
    if url.startswith("mysql://"):
        return url.replace("mysql://", "mysql+pymysql://", 1)
    if url.startswith("mariadb://"):
        return url.replace("mariadb://", "mysql+pymysql://", 1)
    return url


def build_database_url(environment: str) -> str:
    direct_url = first_env("DATABASE_URL")
    if direct_url:
        return normalize_database_url(direct_url)

    connection = first_env("DB_CONNECTION", default="mysql")
    host = first_env("DB_HOST", "MYSQL_HOST", default="127.0.0.1")
    port = first_env("DB_PORT", "MYSQL_PORT", default="3306")
    database = first_env("DB_NAME", "DB_DATABASE", "MYSQL_DATABASE")
    username = first_env("DB_USER", "DB_USERNAME", "MYSQL_USER")
    password = first_env("DB_PASSWORD", "MYSQL_PASSWORD", default="")

    if environment in {"testing", "test"}:
        return "sqlite+pysqlite:///:memory:"

    missing = [
        name
        for name, value in {
            "DB_NAME/DB_DATABASE": database,
            "DB_USER/DB_USERNAME": username,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing database settings: {', '.join(missing)}")

    if connection in {"mysql", "mariadb"}:
        safe_user = quote_plus(username or "")
        safe_password = quote_plus(password or "")
        return f"mysql+pymysql://{safe_user}:{safe_password}@{host}:{port}/{database}?charset=utf8mb4"

    raise RuntimeError(f"Unsupported DB_CONNECTION: {connection}")


@dataclass(frozen=True)
class Settings:
    environment: str
    is_production: bool
    debug: bool
    secret_key: str
    jwt_algorithm: str
    access_token_expire_days: int
    refresh_token_expire_days: int
    api_title: str
    api_version: str
    api_description: str
    api_domain: str
    api_url: str
    cors_origins: List[str]
    cors_allow_credentials: bool
    database_url: str
    db_auto_create: bool
    seed_demo_data: bool
    default_school_name: str
    default_school_code: str
    initial_admin_name: str
    initial_admin_email: str
    initial_admin_phone: str
    initial_admin_password: str


def load_settings() -> Settings:
    environment = first_env("ENVIRONMENT", "APP_ENV", default="development") or "development"
    environment = environment.lower()
    is_production = environment in {"production", "prod"}
    debug = parse_bool(first_env("DEBUG", "APP_DEBUG"), default=not is_production)

    secret_key = first_env("SECRET_KEY", "JWT_SECRET", default="")
    if not secret_key:
        if is_production:
            raise RuntimeError("SECRET_KEY must be set in production.")
        secret_key = DEFAULT_DEV_SECRET_KEY

    if is_production and (secret_key in WEAK_SECRET_KEYS or len(secret_key) < 32):
        raise RuntimeError("SECRET_KEY must be a strong random value in production.")

    cors_origins = parse_csv(
        first_env("CORS_ORIGINS"),
        default=[] if is_production else DEFAULT_DEV_CORS_ORIGINS,
    )
    cors_allow_credentials = parse_bool(first_env("CORS_ALLOW_CREDENTIALS"), default=True)

    if is_production and not cors_origins:
        raise RuntimeError("CORS_ORIGINS must be set in production.")
    if is_production and "*" in cors_origins:
        raise RuntimeError("Wildcard CORS_ORIGINS is not allowed in production.")
    if "*" in cors_origins and cors_allow_credentials:
        cors_allow_credentials = False

    seed_demo_data = parse_bool(first_env("SEED_DEMO_DATA"), default=not is_production)

    return Settings(
        environment=environment,
        is_production=is_production,
        debug=debug,
        secret_key=secret_key,
        jwt_algorithm=first_env("JWT_ALGORITHM", "TOKEN_ALGORITHM", default="HS256") or "HS256",
        access_token_expire_days=get_int_env("ACCESS_TOKEN_EXPIRE_DAYS", 30),
        refresh_token_expire_days=get_int_env("REFRESH_TOKEN_EXPIRE_DAYS", 60),
        api_title=first_env("API_TITLE", default="NovaAdmin API") or "NovaAdmin API",
        api_version=first_env("API_VERSION", default="1.0.0") or "1.0.0",
        api_description=first_env("API_DESCRIPTION", default="School Management System API")
        or "School Management System API",
        api_domain=first_env("API_DOMAIN", default="novaadmin.kesug.com") or "novaadmin.kesug.com",
        api_url=first_env("API_URL", default="https://novaadmin.kesug.com") or "https://novaadmin.kesug.com",
        cors_origins=cors_origins,
        cors_allow_credentials=cors_allow_credentials,
        database_url=build_database_url(environment),
        db_auto_create=parse_bool(first_env("DB_AUTO_CREATE"), default=not is_production),
        seed_demo_data=seed_demo_data,
        default_school_name=first_env("DEFAULT_SCHOOL_NAME", default="NovaAdmin Demo School")
        or "NovaAdmin Demo School",
        default_school_code=first_env("DEFAULT_SCHOOL_CODE", default="NOVA") or "NOVA",
        initial_admin_name=first_env("INITIAL_ADMIN_NAME", default="NovaAdmin Super Admin")
        or "NovaAdmin Super Admin",
        initial_admin_email=first_env("INITIAL_ADMIN_EMAIL", default="admin@novaadmin.kesug.com")
        or "admin@novaadmin.kesug.com",
        initial_admin_phone=first_env("INITIAL_ADMIN_PHONE", default="256700000000") or "256700000000",
        initial_admin_password=first_env("INITIAL_ADMIN_PASSWORD", default="ChangeMe123!"),
    )


settings = load_settings()
