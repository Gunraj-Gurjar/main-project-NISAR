from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.db import Base

connect_args = {}
db_url = settings.database_url

# For local development / test without running Postgres
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(db_url, connect_args=connect_args)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception:
    # Fallback to local SQLite if Postgres is unavailable
    db_url = "sqlite:///./terrain_screening.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables in database."""
    Base.metadata.create_all(bind=engine)
