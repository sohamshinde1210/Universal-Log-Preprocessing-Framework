
from app.normalizer import normalize_event


def test_valid_json_event():
    event = {
        "timestamp": "2026-10-12T10:00:00Z",
        "source_ip": "192.168.1.20",
        "event_type": "login_success",
        "username": "analyst01",
        "severity": "INFO",
    }

    result = normalize_event(event, "json", 1, 1)

    assert result["source_ip"] == "192.168.1.20"
    assert result["severity"] == "low"
    assert result["event_type"] == "login_success"
    assert result["data_quality"]["timestamp_valid"] is True
    assert result["data_quality"]["source_ip_valid"] is True


def test_invalid_source_ip():
    event = {
        "timestamp": "2026-10-12T10:00:00Z",
        "source_ip": "999.999.999.999",
        "severity": "high",
    }

    result = normalize_event(event, "json", 1, 2)

    assert result["source_ip"] is None
    assert result["data_quality"]["source_ip_valid"] is False
    assert "invalid_source_ip" in (
        result["data_quality"]["quality_issues"]
    )

    # The original data must still be available.
    assert result["raw_event"]["source_ip"] == "999.999.999.999"


def test_missing_timestamp_and_severity():
    event = {"username": "admin"}

    result = normalize_event(event, "json", 1, 3)

    assert result["timestamp"] is None
    assert result["severity"] == "unknown"
    assert result["data_quality"]["timestamp_valid"] is False
    assert "missing_or_invalid_timestamp" in (
        result["data_quality"]["quality_issues"]
    )


def test_syslog_message_extraction():
    event = {
        "timestamp": "Oct 13 09:00:00",
        "hostname": "linux-server",
        "application": "sshd",
        "process_id": "1234",
        "message": (
            "Failed password for admin "
            "from 203.0.113.25 port 52210 ssh2"
        ),
    }

    result = normalize_event(event, "syslog", 5, 2)

    assert result["username"] == "admin"
    assert result["source_ip"] == "203.0.113.25"
    assert result["event_type"] == "login_failure"
    assert result["data_quality"]["timestamp_valid"] is True


def test_traceability():
    event = {
        "timestamp": "2026-10-12T10:00:00Z",
        "source_ip": "192.168.1.20",
    }

    result = normalize_event(event, "json", 7, 4)

    assert result["file_id"] == 7
    assert result["record_index"] == 4
    assert result["raw_event"] == event
    
def test_missing_username():
    event = {
        "timestamp": "2026-11-06T10:00:00Z",
        "source_ip": "192.168.1.20",
        "event_type": "login_success",
        "severity": "INFO",
    }

    result = normalize_event(event, "json", 1, 5)

    assert result["data_quality"]["username_valid"] is False
    assert "missing_or_invalid_username" in (
        result["data_quality"]["quality_issues"]
    )


def test_missing_event_type():
    event = {
        "timestamp": "2026-11-06T10:00:00Z",
        "source_ip": "192.168.1.20",
        "username": "analyst01",
        "severity": "INFO",
    }

    result = normalize_event(event, "json", 1, 6)

    assert result["data_quality"]["event_type_valid"] is False
    assert "missing_or_invalid_event_type" in (
        result["data_quality"]["quality_issues"]
    )