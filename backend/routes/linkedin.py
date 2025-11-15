from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models_linkedin import LinkedInCredentials

router = APIRouter()

class LinkedInCredentialsCreate(BaseModel):
    session_id: str
    li_at_cookie: str
    jsessionid_cookie: str | None = None

class LinkedInCredentialsResponse(BaseModel):
    id: int
    has_credentials: bool
    
    class Config:
        from_attributes = True

@router.post("/linkedin/credentials")
async def save_linkedin_credentials(
    data: LinkedInCredentialsCreate,
    db: Session = Depends(get_db)
):
    """Save LinkedIn authentication cookies"""
    # Validate that li_at_cookie is not empty
    if not data.li_at_cookie or not data.li_at_cookie.strip():
        raise HTTPException(status_code=422, detail="li_at_cookie cannot be empty")
    
    try:
        # Check if credentials already exist
        existing = db.query(LinkedInCredentials).filter(
            LinkedInCredentials.session_id == data.session_id
        ).first()
        
        if existing:
            # Update existing credentials
            existing.li_at_cookie = data.li_at_cookie
            existing.jsessionid_cookie = data.jsessionid_cookie
        else:
            # Create new credentials
            credentials = LinkedInCredentials(
                session_id=data.session_id,
                li_at_cookie=data.li_at_cookie,
                jsessionid_cookie=data.jsessionid_cookie
            )
            db.add(credentials)
        
        db.commit()
        
        return {"message": "LinkedIn credentials saved successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving credentials: {str(e)}")

@router.get("/linkedin/credentials/{session_id}", response_model=LinkedInCredentialsResponse)
async def get_linkedin_credentials_status(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Check if LinkedIn credentials are configured"""
    credentials = db.query(LinkedInCredentials).filter(
        LinkedInCredentials.session_id == session_id
    ).first()
    
    if credentials:
        return {"id": credentials.id, "has_credentials": True}
    else:
        return {"id": 0, "has_credentials": False}

@router.delete("/linkedin/credentials/{session_id}")
async def delete_linkedin_credentials(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Delete LinkedIn credentials"""
    credentials = db.query(LinkedInCredentials).filter(
        LinkedInCredentials.session_id == session_id
    ).first()
    
    if credentials:
        db.delete(credentials)
        db.commit()
        return {"message": "LinkedIn credentials deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Credentials not found")
