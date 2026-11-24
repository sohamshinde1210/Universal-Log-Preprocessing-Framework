
import csv
import io
import json
from typing import Any
import re
from defusedxml import ElementTree as SafeET


def parse_json(content: bytes) -> tuple[list[dict], list[dict]]:
    """Parse a JSON object or array of event objects."""
    text = content.decode("utf-8-sig")
    data = json.loads(text)

    if isinstance(data, dict):
        data = [data]

    if not isinstance(data, list):
        raise ValueError("JSON must contain an object or an array of objects.")

    events = []
    errors = []

    for index, item in enumerate(data, start=1):
        if isinstance(item, dict) and item:
            events.append({
                "record_index": index,
                "event_data": item,
            })
        else:
            errors.append({
                "record_index": index,
                "error": "Record must be a non-empty JSON object.",
            })

    if not data:
        errors.append({
            "record_index": 0,
            "error": "JSON file contains no events.",
        })

    return events, errors


def parse_csv(content: bytes) -> tuple[list[dict], list[dict]]:
    """Parse CSV rows into dictionaries using the header row."""
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    headers = reader.fieldnames

    if not headers:
        raise ValueError("CSV file is empty or has no header row.")

    if any(not header.strip() for header in headers):
        raise ValueError("CSV contains an empty column name.")

    if len(headers) != len(set(headers)):
        raise ValueError("CSV contains duplicate column names.")

    events = []
    errors = []

    for index, row in enumerate(reader, start=1):
        # Extra values beyond the header appear under the None key.
        if None in row:
            errors.append({
                "record_index": index,
                "error": "Row contains more values than the header.",
            })
            continue

        if not any(
            value is not None and value.strip()
            for value in row.values()
        ):
            errors.append({
                "record_index": index,
                "error": "Empty CSV row.",
            })
            continue

        events.append({
            "record_index": index,
            "event_data": dict(row),
        })

    if not events and not errors:
        errors.append({
            "record_index": 0,
            "error": "CSV contains no data rows.",
        })

    return events, errors

def _xml_element_to_dict(element):
    """Convert an XML element and its children to Python data."""
    result = {}

    for child in element:
        value = _xml_element_to_dict(child) if len(child) else (
            child.text.strip() if child.text else ""
        )

        if child.tag in result:
            if not isinstance(result[child.tag], list):
                result[child.tag] = [result[child.tag]]
            result[child.tag].append(value)
        else:
            result[child.tag] = value

    for key, value in element.attrib.items():
        result[f"@{key}"] = value

    if not result and element.text:
        return element.text.strip()

    return result


def parse_xml(content: bytes) -> tuple[list[dict], list[dict]]:
    """Extract event records from an XML document."""
    root = SafeET.fromstring(content)

    # If the root contains event children, process each child as a record.
    # Otherwise, treat the root itself as one event.
    children = list(root)
    records = children if children else [root]

    events = []
    errors = []

    for index, element in enumerate(records, start=1):
        event_data = {
            element.tag: _xml_element_to_dict(element)
        }

        if event_data[element.tag]:
            events.append({
                "record_index": index,
                "event_data": event_data,
            })
        else:
            errors.append({
                "record_index": index,
                "error": "Empty XML event.",
            })

    return events, errors


# Common RFC 3164-style Syslog:
# Oct 11 11:30:00 server sshd[1234]: Failed password ...
RFC3164_PATTERN = re.compile(
    r"^(?P<timestamp>[A-Z][a-z]{2}\s+\d{1,2}\s+"
    r"\d{2}:\d{2}:\d{2})\s+"
    r"(?P<hostname>\S+)\s+"
    r"(?P<application>[\w./-]+)"
    r"(?:\[(?P<process_id>\d+)\])?:\s*"
    r"(?P<message>.*)$"
)

# RFC 5424-style Syslog:
# <34>1 2026-10-12T10:00:00Z host app 123 ID - message
RFC5424_PATTERN = re.compile(
    r"^(?:<(?P<priority>\d{1,3})>)?"
    r"(?P<version>\d+)\s+"
    r"(?P<timestamp>\S+)\s+"
    r"(?P<hostname>\S+)\s+"
    r"(?P<application>\S+)\s+"
    r"(?P<process_id>\S+)\s+"
    r"(?P<message_id>\S+)\s+"
    r"(?P<structured_data>(?:-|\[.*?\]))\s*"
    r"(?P<message>.*)$"
)


def parse_syslog(content: bytes) -> tuple[list[dict], list[dict]]:
    """Parse common RFC 3164 and RFC 5424-style Syslog lines."""
    text = content.decode("utf-8-sig")
    events = []
    errors = []

    for index, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue

        match = RFC5424_PATTERN.match(line)

        if match:
            event_data = match.groupdict()
            event_data["format"] = "rfc5424"
        else:
            match = RFC3164_PATTERN.match(line)

            if match:
                event_data = match.groupdict()
                event_data["format"] = "rfc3164"
            else:
                errors.append({
                    "record_index": index,
                    "error": "Line does not match supported Syslog patterns.",
                })
                continue

        events.append({
            "record_index": index,
            "event_data": event_data,
        })

    if not events and not errors:
        errors.append({
            "record_index": 0,
            "error": "Syslog file contains no log lines.",
        })

    return events, errors
