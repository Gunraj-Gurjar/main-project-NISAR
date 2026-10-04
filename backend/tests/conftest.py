import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.job import Base
import os
import shutil
from app.core.config import settings

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_storage():
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    yield
    if os.path.exists(settings.STORAGE_DIR):
        shutil.rmtree(settings.STORAGE_DIR, ignore_errors=True)
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
        except:
            pass

@pytest.fixture
def client():
    return TestClient(app)
