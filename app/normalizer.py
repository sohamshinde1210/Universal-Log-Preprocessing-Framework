
import ipaddress
import re
from datetime import datetime


FIELD_ALIASES = {
    "timestamp": [
        "timestamp", "@timestamp", "time", "datetime",
        "event_time", "date",
    ],
    "source_ip": [
        "source_ip", "src_ip", "src", "client_ip",
        "remote_ip", "ip_address",
    ],
    "destination_ip": [
        "destination_ip", "dest_ip", "dst_ip",
        "destination", "server_ip",
    ],
    "username": [
        "username", "user", "user_name", "account",
        "account_name",
    ],
    "event_type": [
        "event_type", "event", "action", "activity",
        "event_name",
    ],
    "severity": [
        "severity", "level", "priority", "log_level",
    ],
}

SEVERITY_ALIASES = {
    "debug": "low",
    "info": "low",
    "informational": "low",
    "notice": "low",
    "low": "low",
    "warning": "medium",
    "warn": "medium",
    "medium": "medium",
    "error": "high",
    "err": "high",
    "high": "high",
    "critical": "critical",
    "crit": "critical",
    "fatal": "critical",
    "emergency": "critical",
    "alert": "critical",
}


def _flatten_event(event: dict) -> dict:
    """Unwrap common nested XML event structures."""
    result = dict(event)

    if (
        len(result) == 1
        and isinstance(next(iter(result.values())), dict)
    ):
        result = dict(next(iter(result.values())))

    return result


def _find_value(event: dict, aliases: list[str]):
    """Find a field using case-insensitive aliases."""
    lookup = {
        str(key).strip().lower(): value
        for key, value in event.items()
    }

    for alias in aliases:
        value = lookup.get(alias.lower())

        if value is not None and str(value).strip():
            return value

    return None


def _validate_ip(value):
    """Return (valid, normalized IP). Missing values are unknown."""
    if value is None or not str(value).strip():
        return None, None

    try:
        parsed = ipaddress.ip_address(str(value).strip())
        return True, str(parsed)
    except ValueError:
        return False, None


def _validate_timestamp(value):
    """Check supported timestamp formats without guessing a year."""
    if value is None or not str(value).strip():
        return False

    text = str(value).strip()

    # ISO 8601, including a trailing Z for UTC.
    try:
        datetime.fromisoformat(text.replace("Z", "+00:00"))
        return True
    except ValueError:
        pass

    # Common RFC3164 Syslog timestamp: Oct 13 09:00:00
    try:
        datetime.strptime(text, "%b %d %H:%M:%S")
        return True
    except ValueError:
        return False


def _extract_syslog_fields(message: str, normalized: dict):
    """Extract selected fields from recognized SSH log messages."""
    if not normalized["source_ip"]:
        match = re.search(
            r"\bfrom\s+"
            r"((?:\d{1,3}\.){3}\d{1,3}|"
            r"[0-9a-fA-F:]{3,})\b",
            message,
            re.IGNORECASE,
        )
        if match:
            normalized["source_ip"] = match.group(1)

    if not normalized["username"]:
        match = re.search(
            r"\b(?:for|user[=: ]+)\s*"
            r"([A-Za-z0-9_.@-]+)",
            message,
            re.IGNORECASE,
        )
        if match:
            username = match.group(1)
            if username.lower() not in {
                "invalid", "unknown", "authentication",
            }:
                normalized["username"] = username

    lowered = message.lower()

    if not normalized["event_type"]:
        if "failed password" in lowered:
            normalized["event_type"] = "login_failure"
        elif "accepted password" in lowered:
            normalized["event_type"] = "login_success"

    return normalized


def normalize_event(
    event_data: dict,
    source_type: str,
    file_id: int,
    record_index: int,
) -> dict:
    """Normalize an event and attach data-quality information."""
    event = _flatten_event(event_data)

    normalized = {
        "timestamp": _find_value(
            event, FIELD_ALIASES["timestamp"]
        ),
        "source_ip": _find_value(
            event, FIELD_ALIASES["source_ip"]
        ),
        "destination_ip": _find_value(
            event, FIELD_ALIASES["destination_ip"]
        ),
        "username": _find_value(
            event, FIELD_ALIASES["username"]
        ),
        "event_type": _find_value(
            event, FIELD_ALIASES["event_type"]
        ),
        "severity": _find_value(
            event, FIELD_ALIASES["severity"]
        ),
        "source_type": source_type,
        "file_id": file_id,
        "record_index": record_index,
        "raw_event": event_data,
    }

    message = str(event.get("message") or "")
    _extract_syslog_fields(message, normalized)

    # Standardize known severity labels.
    original_severity = normalized["severity"]
    if original_severity is not None:
        severity_key = str(original_severity).strip().lower()
        normalized["severity"] = SEVERITY_ALIASES.get(
            severity_key, "unknown"
        )
    else:
        normalized["severity"] = "unknown"

    # Validate IP addresses, preserving originals in raw_event.
    source_ip_valid, clean_source_ip = _validate_ip(
        normalized["source_ip"]
    )
    destination_ip_valid, clean_destination_ip = _validate_ip(
        normalized["destination_ip"]
    )

    if source_ip_valid is False:
        normalized["source_ip"] = None
    elif source_ip_valid is True:
        normalized["source_ip"] = clean_source_ip

    if destination_ip_valid is False:
        normalized["destination_ip"] = None
    elif destination_ip_valid is True:
        normalized["destination_ip"] = clean_destination_ip

    timestamp_valid = _validate_timestamp(
        normalized["timestamp"]
    )

# Validate username and event type
    username_valid = (
        normalized["username"] is not None
        and bool(str(normalized["username"]).strip())
    )

    event_type_valid = (
        normalized["event_type"] is not None
         and bool(str(normalized["event_type"]).strip())
    )

    quality_issues = []

    if not timestamp_valid:
        quality_issues.append("missing_or_invalid_timestamp")

    if source_ip_valid is False:
        quality_issues.append("invalid_source_ip")

    if destination_ip_valid is False:
        quality_issues.append("invalid_destination_ip")

    if normalized["severity"] == "unknown":
        quality_issues.append("unknown_or_missing_severity")

    if not username_valid:
        quality_issues.append("missing_or_invalid_username")

    if not event_type_valid:
        quality_issues.append("missing_or_invalid_event_type")

    normalized["data_quality"] = {
        "timestamp_valid": timestamp_valid,
        "source_ip_valid": source_ip_valid,
        "destination_ip_valid": destination_ip_valid,
        "username_valid": username_valid,
        "event_type_valid": event_type_valid,
        "quality_issues": quality_issues,
    }

    return normalized
