import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database URL configured via environment variable with standard local default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/payrecover"
)


def create_db_engine():
    """
    Creates SQLAlchemy database engine.
    Tries PostgreSQL connection first. If unavailable, safely falls back
    to a persistent SQLite file database (payrecover.db) for smooth local development.
    """
    if DATABASE_URL.startswith("postgresql"):
        try:
            temp_engine = create_engine(
                DATABASE_URL,
                connect_args={"connect_timeout": 3}
            )
            with temp_engine.connect() as conn:
                pass
            print(f"Connected successfully to PostgreSQL database: {DATABASE_URL}")
            return temp_engine
        except Exception as e:
            print(f"PostgreSQL connection unavailable ({e}). Using persistent SQLite database fallback...")

    sqlite_url = "sqlite:///./payrecover.db"
    print(f"Using database: {sqlite_url}")
    return create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}
    )


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    FastAPI dependency to yield a database session per request
    and close it when the request is complete.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
