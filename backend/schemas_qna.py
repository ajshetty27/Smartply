from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class QnACreate(BaseModel):
    question: str
    answer: Optional[str] = None
    generate_answer: bool = False  # If True, use AI to generate answer
    job_id: Optional[int] = None  # Optional job context for AI generation

class QnAUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None

class QnAResponse(BaseModel):
    id: int
    job_id: Optional[int] = None
    question: str
    answer: str
    is_ai_generated: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
