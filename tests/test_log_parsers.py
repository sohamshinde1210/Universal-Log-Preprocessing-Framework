
import pytest

from app.log_parsers import (
    parse_json,
    parse_csv,
    parse_xml,
    parse_syslog,
)


# -------------------------
# JSON PARSER TESTS
# -------------------------

def test_parse_valid_json_object():
    content = b'{"username": "analyst03", "event_type": "login_success"}'

    events, errors = parse_json(content)

    assert len(events) == 1
    assert events[0]["record_index"] == 1
    assert events[0]["event_data"]["username"] == "analyst03"
    assert errors == []


def test_parse_valid_json_array():
    content = b'[{"user": "admin"}, {"user": "analyst"}]'

    events, errors = parse_json(content)

    assert len(events) == 2
    assert events[1]["event_data"]["user"] == "analyst"
    assert errors == []


def test_parse_json_with_invalid_record():
    content = b'[{"user": "admin"}, null, {}, {"user": "analyst"}]'

    events, errors = parse_json(content)

    assert len(events) == 2
    assert len(errors) == 2
    assert errors[0]["record_index"] == 2
    assert errors[1]["record_index"] == 3


def test_parse_malformed_json():
    content = b'{"username": "admin"'

    with pytest.raises(ValueError):
        parse_json(content)


# -------------------------
# CSV PARSER TESTS
# -------------------------

def test_parse_valid_csv():
    content = (
        b"username,event_type\n"
        b"admin,login_failure\n"
        b"analyst,login_success\n"
    )

    events, errors = parse_csv(content)

    assert len(events) == 2
    assert events[0]["event_data"]["username"] == "admin"
    assert events[1]["event_data"]["event_type"] == "login_success"
    assert errors == []


def test_parse_csv_with_extra_values():
    content = (
        b"username,event_type\n"
        b"admin,login_failure,unexpected\n"
    )

    events, errors = parse_csv(content)

    assert events == []
    assert len(errors) == 1
    assert "more values" in errors[0]["error"]


def test_parse_csv_with_duplicate_headers():
    content = b"username,username\nadmin,analyst\n"

    with pytest.raises(ValueError, match="duplicate column"):
        parse_csv(content)


def test_parse_csv_without_header():
    content = b""

    with pytest.raises(ValueError, match="header row"):
        parse_csv(content)


# -------------------------
# XML PARSER TESTS
# -------------------------

def test_parse_valid_xml():
    content = (
        b"<events>"
        b"<event><username>admin</username>"
        b"<action>login</action></event>"
        b"<event><username>analyst</username>"
        b"<action>logout</action></event>"
        b"</events>"
    )

    events, errors = parse_xml(content)

    assert len(events) == 2
    assert events[0]["event_data"]["event"]["username"] == "admin"
    assert events[1]["event_data"]["event"]["action"] == "logout"
    assert errors == []


def test_parse_malformed_xml():
    content = b"<events><event></events>"

    with pytest.raises(Exception):
        parse_xml(content)


# -------------------------
# SYSLOG PARSER TESTS
# -------------------------

def test_parse_valid_rfc3164_syslog():
    content = (
        b"Oct 11 11:30:00 server sshd[1234]: "
        b"Failed password for admin\n"
    )

    events, errors = parse_syslog(content)

    assert len(events) == 1
    assert events[0]["event_data"]["hostname"] == "server"
    assert events[0]["event_data"]["application"] == "sshd"
    assert events[0]["event_data"]["format"] == "rfc3164"
    assert errors == []


def test_parse_valid_rfc5424_syslog():
    content = (
        b"<34>1 2026-10-12T10:00:00Z host app 123 ID - "
        b"Login successful\n"
    )

    events, errors = parse_syslog(content)

    assert len(events) == 1
    assert events[0]["event_data"]["hostname"] == "host"
    assert events[0]["event_data"]["format"] == "rfc5424"
    assert errors == []


def test_parse_syslog_with_invalid_line():
    content = b"This is not a valid syslog line\n"

    events, errors = parse_syslog(content)

    assert events == []
    assert len(errors) == 1
    assert errors[0]["record_index"] == 1


def test_parse_empty_syslog():
    content = b""

    events, errors = parse_syslog(content)

    assert events == []
    assert len(errors) == 1
    assert errors[0]["record_index"] == 0
