
import hashlib
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.log_parsers import (
    parse_json,
    parse_csv,
    parse_xml,
    parse_syslog,
)
from app.models import (
    RawLog,
    IngestedFile,
    ParsedRecord,
    NormalizedRecord,
)
from app.normalizer import normalize_event
from app.schemas import RawLogCreate, RawLogResponse


# --------------------------------------------------
# PROJECT CONFIGURATION
# --------------------------------------------------

PROJECT_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = PROJECT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

SUPPORTED_EXTENSIONS = {
    ".json": "json",
    ".csv": "csv",
    ".xml": "xml",
    ".log": "syslog",
    ".syslog": "syslog",
    ".txt": "syslog",
}


# --------------------------------------------------
# APPLICATION STARTUP
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Universal Log Pre-processing Framework",
    description="Ingest, preserve, parse, and normalize security logs.",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# HOME AND HEALTH
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "project": "ULPF",
        "status": "running",
        "message": "Universal Log Pre-processing Framework is ready!",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# --------------------------------------------------
# RAW LOG CREATION
# --------------------------------------------------

@app.post(
    "/api/raw-logs",
    response_model=RawLogResponse,
    status_code=201,
    tags=["Raw Logs"],
)
def create_raw_log(
    payload: RawLogCreate,
    db: Session = Depends(get_db),
):
    digest = hashlib.sha256(
        payload.raw_content.encode("utf-8")
    ).hexdigest()

    log = RawLog(
        source_type=payload.source_type,
        source_name=payload.source_name,
        raw_content=payload.raw_content,
        sha256_hash=digest,
    )

    try:
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    except Exception:
        db.rollback()
        raise


@app.get(
    "/api/raw-logs",
    response_model=list[RawLogResponse],
    tags=["Raw Logs"],
)
def list_raw_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    statement = (
        select(RawLog)
        .order_by(RawLog.id.desc())
        .offset(offset)
        .limit(limit)
    )

    return db.scalars(statement).all()


@app.get(
    "/api/raw-logs/{log_id}",
    response_model=RawLogResponse,
    tags=["Raw Logs"],
)
def get_raw_log(
    log_id: int,
    db: Session = Depends(get_db),
):
    log = db.get(RawLog, log_id)

    if log is None:
        raise HTTPException(
            status_code=404,
            detail="Raw log not found",
        )

    return log


@app.get(
    "/api/raw-logs/{log_id}/verify",
    tags=["Raw Logs"],
)
def verify_raw_log(
    log_id: int,
    db: Session = Depends(get_db),
):
    log = db.get(RawLog, log_id)

    if log is None:
        raise HTTPException(
            status_code=404,
            detail="Raw log not found",
        )

    current_hash = hashlib.sha256(
        log.raw_content.encode("utf-8")
    ).hexdigest()

    return {
        "log_id": log.id,
        "integrity_verified": current_hash == log.sha256_hash,
        "stored_hash": log.sha256_hash,
        "current_hash": current_hash,
    }


# --------------------------------------------------
# FILE INGESTION
# --------------------------------------------------

@app.post(
    "/api/ingest/upload",
    status_code=200,
    tags=["File Ingestion"],
)
async def upload_log_file(
    file: UploadFile = File(...),
    source_type: str = Form(default="auto"),
    db: Session = Depends(get_db),
):
    original_name = Path(file.filename or "").name

    if not original_name or original_name in {".", ".."}:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename",
        )

    if len(original_name) > 255:
        raise HTTPException(
            status_code=400,
            detail="Filename is too long",
        )

    extension = Path(original_name).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file extension. Use JSON, CSV, XML, LOG, or TXT.",
        )

    try:
        content = await file.read(MAX_FILE_SIZE + 1)
    finally:
        await file.close()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the 5 MB upload limit",
        )

    try:
        content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="File must contain valid UTF-8 text",
        ) from exc

    detected_type = SUPPORTED_EXTENSIONS[extension]
    requested_type = source_type.strip().lower()

    if requested_type == "auto":
        final_source_type = detected_type

    elif requested_type in set(SUPPORTED_EXTENSIONS.values()):
        if requested_type != detected_type:
            raise HTTPException(
                status_code=400,
                detail="Source type does not match the file extension",
            )

        final_source_type = requested_type

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid source_type",
        )

    digest = hashlib.sha256(content).hexdigest()

    existing_files = db.scalars(
        select(IngestedFile).where(
            IngestedFile.sha256_hash == digest
        )
    ).all()

    for existing_file in existing_files:
        existing_path = UPLOAD_DIR / existing_file.stored_filename

        try:
            if not existing_path.is_file():
                continue

            existing_digest = hashlib.sha256(
                existing_path.read_bytes()
            ).hexdigest()

        except OSError:
            continue

        if existing_digest == digest:
            return {
                "message": "Duplicate file detected",
                "duplicate": True,
                "existing_file_id": existing_file.id,
                "original_filename": existing_file.original_filename,
                "sha256_hash": digest,
                "status": existing_file.status,
            }

    destination = None
    file_created = False
    record = None

    try:
        while True:
            stored_name = f"{uuid.uuid4().hex}{extension}"
            candidate = UPLOAD_DIR / stored_name

            try:
                output = candidate.open("xb")
                destination = candidate
                file_created = True
                break

            except FileExistsError:
                continue

        with output:
            output.write(content)

        record = IngestedFile(
            original_filename=original_name,
            stored_filename=destination.name,
            source_type=final_source_type,
            sha256_hash=digest,
            size_bytes=len(content),
            status="received",
        )

        db.add(record)
        db.commit()
        db.refresh(record)

    except Exception as exc:
        db.rollback()

        if file_created and destination is not None:
            try:
                destination.unlink(missing_ok=True)
            except OSError:
                pass

        raise HTTPException(
            status_code=500,
            detail=f"File upload failed: {str(exc)}",
        ) from exc

    return JSONResponse(
        status_code=201,
        content={
            "message": "File ingested successfully",
            "duplicate": False,
            "file_id": record.id,
            "original_filename": record.original_filename,
            "source_type": record.source_type,
            "size_bytes": record.size_bytes,
            "sha256_hash": record.sha256_hash,
            "status": record.status,
        },
    )


# --------------------------------------------------
# LIST INGESTED FILES
# --------------------------------------------------

@app.get(
    "/api/ingest/files",
    tags=["File Ingestion"],
)
def list_ingested_files(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    statement = (
        select(IngestedFile)
        .order_by(IngestedFile.id.desc())
        .offset(offset)
        .limit(limit)
    )

    records = db.scalars(statement).all()

    return [
        {
            "file_id": record.id,
            "original_filename": record.original_filename,
            "source_type": record.source_type,
            "size_bytes": record.size_bytes,
            "sha256_hash": record.sha256_hash,
            "status": record.status,
            "received_at": record.received_at,
        }
        for record in records
    ]


# --------------------------------------------------
# VERIFY INGESTED FILE INTEGRITY
# --------------------------------------------------

@app.get(
    "/api/ingest/files/{file_id}/verify",
    tags=["File Ingestion"],
)
def verify_ingested_file(
    file_id: int,
    db: Session = Depends(get_db),
):
    record = db.get(IngestedFile, file_id)

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Ingested file not found",
        )

    path = UPLOAD_DIR / record.stored_filename

    if not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Stored file is missing",
        )

    try:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not read the stored file",
        ) from exc

    return {
        "file_id": record.id,
        "original_filename": record.original_filename,
        "integrity_verified": digest == record.sha256_hash,
        "stored_hash": record.sha256_hash,
        "current_hash": digest,
    }


# --------------------------------------------------
# PARSE INGESTED FILE
# --------------------------------------------------

@app.post(
    "/api/ingest/files/{file_id}/parse",
    tags=["Log Parsing"],
)
def parse_ingested_file(
    file_id: int,
    db: Session = Depends(get_db),
):
    record = db.get(IngestedFile, file_id)

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Ingested file not found",
        )

    path = UPLOAD_DIR / record.stored_filename

    if not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Stored file is missing",
        )

    try:
        content = path.read_bytes()
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not read the stored file",
        ) from exc

    current_hash = hashlib.sha256(content).hexdigest()

    if current_hash != record.sha256_hash:
        raise HTTPException(
            status_code=409,
            detail="File integrity check failed. Parsing stopped.",
        )

    try:
        if record.source_type == "json":
            events, errors = parse_json(content)

        elif record.source_type == "csv":
            events, errors = parse_csv(content)

        elif record.source_type == "xml":
            events, errors = parse_xml(content)

        elif record.source_type == "syslog":
            events, errors = parse_syslog(content)

        else:
            raise HTTPException(
                status_code=415,
                detail="Unsupported parser for this file type.",
            )

    except HTTPException:
        raise

    except Exception as exc:
        try:
            db.query(ParsedRecord).filter_by(
                file_id=file_id
            ).delete(synchronize_session=False)

            db.add(
                ParsedRecord(
                    file_id=file_id,
                    record_index=0,
                    status="failed",
                    event_data=None,
                    error_message=str(exc),
                )
            )

            record.status = "parse_failed"
            db.commit()

        except Exception:
            db.rollback()
            raise

        return {
            "file_id": file_id,
            "status": "parse_failed",
            "parsed_count": 0,
            "failed_count": 1,
            "errors": [
                {
                    "record_index": 0,
                    "error": str(exc),
                }
            ],
        }

    try:
        db.query(ParsedRecord).filter_by(
            file_id=file_id
        ).delete(synchronize_session=False)

        for event in events:
            db.add(
                ParsedRecord(
                    file_id=file_id,
                    record_index=event["record_index"],
                    status="parsed",
                    event_data=event["event_data"],
                )
            )

        for error in errors:
            db.add(
                ParsedRecord(
                    file_id=file_id,
                    record_index=error["record_index"],
                    status="failed",
                    error_message=error["error"],
                )
            )

        if events and errors:
            record.status = "partially_parsed"
        elif events:
            record.status = "parsed"
        else:
            record.status = "parse_failed"

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "file_id": file_id,
        "filename": record.original_filename,
        "status": record.status,
        "parsed_count": len(events),
        "failed_count": len(errors),
        "events": events,
        "errors": errors,
    }


# --------------------------------------------------
# GET PARSED RECORDS
# --------------------------------------------------

@app.get(
    "/api/ingest/files/{file_id}/records",
    tags=["Log Parsing"],
)
def get_parsed_records(
    file_id: int,
    db: Session = Depends(get_db),
):
    record = db.get(IngestedFile, file_id)

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Ingested file not found",
        )

    statement = (
        select(ParsedRecord)
        .where(ParsedRecord.file_id == file_id)
        .order_by(ParsedRecord.record_index)
    )

    results = db.scalars(statement).all()

    return {
        "file_id": file_id,
        "filename": record.original_filename,
        "records": [
            {
                "record_id": item.id,
                "record_index": item.record_index,
                "status": item.status,
                "event_data": item.event_data,
                "error_message": item.error_message,
            }
            for item in results
        ],
    }


# --------------------------------------------------
# NORMALIZE PARSED RECORDS
# --------------------------------------------------

@app.post(
    "/api/ingest/files/{file_id}/normalize",
    tags=["Normalization"],
)
def normalize_ingested_file(
    file_id: int,
    db: Session = Depends(get_db),
):
    file_record = db.get(IngestedFile, file_id)

    if file_record is None:
        raise HTTPException(
            status_code=404,
            detail="Ingested file not found",
        )

    parsed_records = (
        db.query(ParsedRecord)
        .filter(
            ParsedRecord.file_id == file_id,
            ParsedRecord.status == "parsed",
        )
        .order_by(ParsedRecord.record_index)
        .all()
    )

    if not parsed_records:
        raise HTTPException(
            status_code=400,
            detail="No successfully parsed records found. Parse the file first.",
        )

    normalized_events = []

    for parsed in parsed_records:
        if not isinstance(parsed.event_data, dict):
            continue

        normalized_events.append(
            normalize_event(
                event_data=parsed.event_data,
                source_type=file_record.source_type,
                file_id=file_id,
                record_index=parsed.record_index,
            )
        )

    if not normalized_events:
        raise HTTPException(
            status_code=400,
            detail="No valid event dictionaries were available to normalize.",
        )

    try:
        (
            db.query(NormalizedRecord)
            .filter(NormalizedRecord.file_id == file_id)
            .delete(synchronize_session=False)
        )

        for event in normalized_events:
            db.add(
                NormalizedRecord(
                    file_id=file_id,
                    record_index=event["record_index"],
                    normalized_data=event,
                )
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "file_id": file_id,
        "filename": file_record.original_filename,
        "status": "normalized",
        "normalized_count": len(normalized_events),
        "events": normalized_events,
    }


# --------------------------------------------------
# GET NORMALIZED RECORDS
# --------------------------------------------------

@app.get(
    "/api/ingest/files/{file_id}/normalized",
    tags=["Normalization"],
)
def get_normalized_records(
    file_id: int,
    db: Session = Depends(get_db),
):
    file_record = db.get(IngestedFile, file_id)

    if file_record is None:
        raise HTTPException(
            status_code=404,
            detail="Ingested file not found",
        )

    records = (
        db.query(NormalizedRecord)
        .filter(NormalizedRecord.file_id == file_id)
        .order_by(NormalizedRecord.record_index)
        .all()
    )

    return {
        "file_id": file_id,
        "filename": file_record.original_filename,
        "normalized_count": len(records),
        "events": [
            item.normalized_data
            for item in records
        ],
    }
