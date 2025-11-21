from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InterviewSessionCreate(BaseModel):
    job_id: Optional[int] = None
    resume_id: Optional[int] = None
    voice: str = "alloy"  # alloy (male) or shimmer (female)

class InterviewSessionResponse(BaseModel):
    id: int
    job_id: Optional[int]
    resume_id: Optional[int]
    voice: str
    call_id: Optional[str]
    status: str
    duration_seconds: int
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class InterviewWebRTCOffer(BaseModel):
    session_id: int
    sdp: str  # Session Description Protocol offer

class InterviewWebRTCAnswer(BaseModel):
    sdp: str  # Session Description Protocol answer
    call_id: str
