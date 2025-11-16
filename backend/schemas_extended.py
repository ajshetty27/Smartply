from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ResumeUpload(BaseModel):
    session_id: str

class ResumeResponse(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

class CoverLetterGenerate(BaseModel):
    job_id: int
    resume_id: int
    session_id: str
    additional_prompt: Optional[str] = None

class CoverLetterResponse(BaseModel):
    id: int
    job_id: int
    content: str
    resume_modifications: Optional[str] = None  # JSON string
    generated_at: datetime
    
    class Config:
        from_attributes = True
