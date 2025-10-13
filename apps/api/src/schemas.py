"""
Pydantic schemas for API request/response validation
"""
from datetime import datetime
from uuid import UUID
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class JobCreate(BaseModel):
    """Schema for creating a new job"""
    name: str = Field(..., description="Job name", min_length=1)
    params: Dict[str, Any] = Field(default_factory=dict, description="Job parameters as JSON")
    priority: int = Field(default=0, description="Job priority (higher = more important)")
    submitted_by: Optional[str] = Field(None, description="Who submitted the job")


class JobResponse(BaseModel):
    """Schema for job response"""
    id: UUID
    name: str
    params: Dict[str, Any]
    priority: int
    state: str
    created_at: datetime
    submitted_by: Optional[str]

    class Config:
        from_attributes = True  # Allows creating from SQLAlchemy models
