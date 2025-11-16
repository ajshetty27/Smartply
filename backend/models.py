from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from datetime import datetime
from database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # Nullable for backward compatibility - will add ForeignKey later
    session_id = Column(String, index=True)  # Simple session management for now
    url = Column(String, nullable=True)  # Nullable for manual text input
    source = Column(String)  # "linkedin", "indeed", or "manual"
    job_title = Column(String)
    company_name = Column(String)
    location = Column(String, nullable=True)
    job_description = Column(Text)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    is_scraped = Column(Boolean, default=False)  # True if from URL, False if manual
    stage = Column(String, default='found')  # Stages: found, documents, applied, rejected, interview, accepted
    
    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "source": self.source,
            "job_title": self.job_title,
            "company_name": self.company_name,
            "location": self.location,
            "job_description": self.job_description,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
            "is_scraped": self.is_scraped,
            "stage": self.stage
        }
