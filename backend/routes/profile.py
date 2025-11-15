from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models_profile import UserProfile
from schemas_profile import UserProfileCreate, UserProfileResponse
from models_user import User
from auth import get_current_user

router = APIRouter()

@router.post("/profile", response_model=UserProfileResponse)
async def create_or_update_profile(
    data: UserProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update user profile"""
    try:
        # Check if profile already exists for this user
        existing = db.query(UserProfile).filter(
            UserProfile.session_id == data.session_id,
            UserProfile.user_id == current_user.id
        ).first()
        
        if existing:
            # Update existing profile
            existing.full_name = data.full_name
            existing.email = data.email
            existing.phone = data.phone
            existing.location = data.location
            existing.additional_information = data.additional_information
            profile = existing
        else:
            # Create new profile
            profile = UserProfile(
                session_id=data.session_id,
                full_name=data.full_name,
                email=data.email,
                phone=data.phone,
                location=data.location,
                additional_information=data.additional_information,
                user_id=current_user.id
            )
            db.add(profile)
        
        db.commit()
        db.refresh(profile)
        
        return profile
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving profile: {str(e)}")

@router.get("/profile/{session_id}", response_model=UserProfileResponse)
async def get_profile(
    session_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user profile"""
    profile = db.query(UserProfile).filter(
        UserProfile.session_id == session_id,
        UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        # Return empty profile if doesn't exist
        return UserProfileResponse(
            id=0,
            session_id=session_id,
            full_name=None,
            email=None,
            phone=None,
            location=None
        )
    
    return profile
