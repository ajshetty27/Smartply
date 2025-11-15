from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from database import Base

class LinkedInCredentials(Base):
    __tablename__ = "linkedin_credentials"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    li_at_cookie = Column(Text)  # LinkedIn session cookie
    jsessionid_cookie = Column(Text, nullable=True)  # Optional additional cookie
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
