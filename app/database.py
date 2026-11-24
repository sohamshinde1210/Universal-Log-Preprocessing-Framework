
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# Project directories
PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# SQLite database file
DATABASE_PATH = DATA_DIR / "ulpf.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

# Database connection
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Database sessions
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


# Base class for all database models
class Base(DeclarativeBase):
    pass


# Dependency used by FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
