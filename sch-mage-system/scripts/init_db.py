from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from database import SessionLocal, create_schema, ensure_database_exists
from seed_data import ensure_initial_data


def main() -> None:
    ensure_database_exists()
    create_schema()
    with SessionLocal() as db:
        ensure_initial_data(db)
    print("NovaAdmin database schema and seed data are ready.")


if __name__ == "__main__":
    main()
