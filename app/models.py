
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RawLog(Base):
    __tablename__ = "raw_logs"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    source_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    source_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    raw_content: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    sha256_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class IngestedFile(Base):
    __tablename__ = "ingested_files"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    original_filename: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    stored_filename: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    source_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )
    sha256_hash: Mapped[str] = mapped_column(
        String(64), nullable=False
    )
    size_bytes: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="received"
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class ParsedRecord(Base):
    __tablename__ = "parsed_records"

    __table_args__ = (
        UniqueConstraint(
            "file_id",
            "record_index",
            name="uq_parsed_file_record",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    file_id: Mapped[int] = mapped_column(
        ForeignKey("ingested_files.id"),
        nullable=False,
        index=True,
    )
    record_index: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    event_data: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
   
class NormalizedRecord(Base):
    __tablename__ = "normalized_records"

    __table_args__ = (
        UniqueConstraint(
            "file_id",
            "record_index",
            name="uq_normalized_file_record",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    file_id: Mapped[int] = mapped_column(
        ForeignKey("ingested_files.id"),
        nullable=False,
        index=True,
    )
    record_index: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    normalized_data: Mapped[dict] = mapped_column(
        JSON, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
 