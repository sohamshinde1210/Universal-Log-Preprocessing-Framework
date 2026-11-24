
import hashlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
from app.database import Base


# Sample JSON security logs for integration testing
SAMPLE_JSON = b"""
[
    {
        "timestamp": "2026-11-04T10:00:00Z",
        "source_ip": "192.168.1.20",
        "event_type": "login_success",
        "username": "analyst01",
        "severity": "low"
    },
    {
        "timestamp": "2026-11-04T10:05:00Z",
        "source_ip": "203.0.113.10",
        "event_type": "login_failure",
        "username": "admin01",
        "severity": "high"
    }
]
"""


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Create a separate in-memory test database
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
    )

    # Redirect application startup to the test database
    monkeypatch.setattr(main, "engine", test_engine)

    # Redirect uploaded files to a temporary directory
    test_upload_dir = tmp_path / "test_uploads"
    test_upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", test_upload_dir)

    # Override the database dependency
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[main.get_db] = override_get_db

    # Run the application and its lifespan
    with TestClient(main.app) as test_client:
        yield test_client

    # Clean up after testing
    main.app.dependency_overrides.clear()
    test_engine.dispose()


def upload_sample(client):
    return client.post(
        "/api/ingest/upload",
        files={
            "file": (
                "integration.json",
                SAMPLE_JSON,
                "application/json",
            )
        },
        data={"source_type": "auto"},
    )


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_complete_ingestion_workflow(client):
    # 1. Upload file
    upload_response = upload_sample(client)

    assert upload_response.status_code == 201

    upload_data = upload_response.json()

    assert upload_data["duplicate"] is False
    assert upload_data["source_type"] == "json"
    assert upload_data["status"] == "received"

    file_id = upload_data["file_id"]

    # 2. Verify file integrity
    verify_response = client.get(
        f"/api/ingest/files/{file_id}/verify"
    )

    assert verify_response.status_code == 200

    verify_data = verify_response.json()

    expected_hash = hashlib.sha256(SAMPLE_JSON).hexdigest()

    assert verify_data["integrity_verified"] is True
    assert verify_data["stored_hash"] == expected_hash
    assert verify_data["current_hash"] == expected_hash

    # 3. Parse the uploaded file
    parse_response = client.post(
        f"/api/ingest/files/{file_id}/parse"
    )

    assert parse_response.status_code == 200

    parse_data = parse_response.json()

    assert parse_data["status"] == "parsed"
    assert parse_data["parsed_count"] == 2
    assert parse_data["failed_count"] == 0

    # 4. Retrieve parsed records
    records_response = client.get(
        f"/api/ingest/files/{file_id}/records"
    )

    assert records_response.status_code == 200

    records = records_response.json()["records"]

    assert len(records) == 2
    assert records[0]["status"] == "parsed"
    assert records[1]["status"] == "parsed"

    # 5. Normalize parsed records
    normalize_response = client.post(
        f"/api/ingest/files/{file_id}/normalize"
    )

    assert normalize_response.status_code == 200

    normalize_data = normalize_response.json()

    assert normalize_data["status"] == "normalized"
    assert normalize_data["normalized_count"] == 2

    # 6. Retrieve normalized records
    normalized_response = client.get(
        f"/api/ingest/files/{file_id}/normalized"
    )

    assert normalized_response.status_code == 200

    normalized_data = normalized_response.json()

    assert normalized_data["normalized_count"] == 2

    events = normalized_data["events"]

    assert events[0]["event_type"] == "login_success"
    assert events[1]["event_type"] == "login_failure"
    assert events[0]["file_id"] == file_id
    assert events[1]["file_id"] == file_id


def test_duplicate_file_detection(client):
    first_response = upload_sample(client)

    assert first_response.status_code == 201

    second_response = upload_sample(client)

    assert second_response.status_code == 200

    duplicate_data = second_response.json()

    assert duplicate_data["duplicate"] is True
    assert duplicate_data["existing_file_id"] == (
        first_response.json()["file_id"]
    )


def test_unsupported_file_extension(client):
    response = client.post(
        "/api/ingest/upload",
        files={
            "file": (
                "malware.exe",
                b"test content",
                "application/octet-stream",
            )
        },
        data={"source_type": "auto"},
    )

    assert response.status_code == 415


def test_missing_file_returns_404(client):
    response = client.get(
        "/api/ingest/files/99999/verify"
    )

    assert response.status_code == 404


def test_corrupted_file_rejected_before_parsing(client):
    # 1. Upload a valid JSON file
    upload_response = upload_sample(client)

    assert upload_response.status_code == 201

    file_id = upload_response.json()["file_id"]

    # 2. Locate the stored file in the temporary upload directory
    stored_files = list(main.UPLOAD_DIR.glob("*.json"))

    assert len(stored_files) == 1

    stored_path = stored_files[0]

    # 3. Modify the stored file to simulate corruption
    stored_path.write_bytes(b'{"tampered": true}')

    # 4. Verify that integrity checking detects the modification
    verify_response = client.get(
        f"/api/ingest/files/{file_id}/verify"
    )

    assert verify_response.status_code == 200
    assert verify_response.json()["integrity_verified"] is False

    # 5. Confirm that parsing is blocked
    parse_response = client.post(
        f"/api/ingest/files/{file_id}/parse"
    )

    assert parse_response.status_code == 409
    assert "integrity check failed" in (
        parse_response.json()["detail"].lower()
    )
