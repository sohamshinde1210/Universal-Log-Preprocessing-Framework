
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RawLogCreate(BaseModel):
    source_type: str = Field(min_length=1, max_length=50)
    source_name: str | None = Field(default=None, max_length=255)
    raw_content: str = Field(min_length=1, max_length=1_000_000)

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, value: str) -> str:
        value = value.strip().lower()
        if not value:
            raise ValueError("Source type cannot be empty")
        return value


class RawLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_type: str
    source_name: str | None
    raw_content: str
    sha256_hash: str
    received_at: datetime
