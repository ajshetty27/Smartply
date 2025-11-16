from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ScoutSearchRequest(BaseModel):
    country: str = "us"  # Default to US
    location: Optional[str] = None  # e.g., "New York", "Remote"
    max_results: int = 20

class ScoutedJobResponse(BaseModel):
    id: int
    external_id: Optional[str]
    title: str
    company: str
    location: Optional[str]
    description: Optional[str]
    salary_min: Optional[float]  # Changed to float to match Adzuna API
    salary_max: Optional[float]  # Changed to float to match Adzuna API
    contract_type: Optional[str]
    redirect_url: str
    relevance_score: float
    scouted_at: datetime
    status: str
    
    class Config:
        from_attributes = True

class JobActionRequest(BaseModel):
    action: str  # "save" or "dismiss"
