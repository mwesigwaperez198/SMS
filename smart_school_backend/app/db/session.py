import logging
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def get_db() -> Generator[Session, None, None]:
    settings = get_settings()
    url = settings.database_url
    connect_args = {}

    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    elif "sslmode" not in url:
        separator = "&" if "?" in url else "?"
        url += f"{separator}sslmode=require"

    engine = create_engine(url, pool_pre_ping=True, connect_args=connect_args)
    session_maker = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = session_maker()
    try:
        yield db
    except Exception as e:
        logger.error("Database session error: %s", e)
        raise
    finally:
        db.close()
