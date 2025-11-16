from pydantic import BaseModel, HttpUrl, validator
from typing import Optional
from datetime import datetime

class JobURLSubmit(BaseModel):
    url: str
    session_id: str
    
    @validator('url')
    def validate_url(cls, v):
        v = v.strip()
        if not v.startswith('http'):
            v = 'https://' + v
        
        # Check if it's LinkedIn or Indeed
        if 'linkedin.com' not in v and 'indeed.com' not in v:
            raise ValueError('URL must be from LinkedIn or Indeed')
        return v

class JobManualSubmit(BaseModel):
    job_title: str
    company_name: str
    location: Optional[str] = None
    job_description: str
    session_id: str

class JobResponse(BaseModel):
    id: int
    url: Optional[str]
    source: str
    job_title: str
    company_name: str
    location: Optional[str]
    job_description: str
    scraped_at: datetime
    is_scraped: bool
    stage: str = 'found'
    
    class Config:
        from_attributes = True
