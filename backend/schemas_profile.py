from pydantic import BaseModel
from typing import Optional

class UserProfileCreate(BaseModel):
    session_id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    additional_information: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: int
    session_id: str
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    additional_information: Optional[str]
    
    class Config:
        from_attributes = True
