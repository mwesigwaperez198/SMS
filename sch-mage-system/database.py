from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from settings import settings


connect_args = {}
engine_kwargs = {"pool_pre_ping": True, "future": True}

if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    if settings.database_url.endswith(":memory:"):
        engine_kwargs["poolclass"] = StaticPool

engine = create_engine(settings.database_url, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_schema() -> None:
    import db_models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def ensure_database_exists() -> None:
    if not engine.dialect.name.startswith("mysql"):
        return

    database_name = engine.url.database
    if not database_name:
        return

    url = engine.url
    server_url = URL.create(
        drivername=url.drivername,
        username=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
        query=dict(url.query),
    )
    server_engine = create_engine(server_url, pool_pre_ping=True, future=True)
    safe_database_name = database_name.replace("`", "``")
    with server_engine.begin() as connection:
        connection.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{safe_database_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )
    server_engine.dispose()
