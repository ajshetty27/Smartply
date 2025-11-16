from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from datetime import datetime
from database import Base

class ScoutedJob(Base):
    __tablename__ = "scouted_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    external_id = Column(String, index=True)  # Adzuna job ID
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String)
    description = Column(Text)
    salary_min = Column(Float, nullable=True)  # Changed to Float to match Adzuna API
    salary_max = Column(Float, nullable=True)  # Changed to Float to match Adzuna API
    contract_type = Column(String, nullable=True)  # permanent, contract, part_time
    redirect_url = Column(String, nullable=False)  # Application URL
    relevance_score = Column(Float, default=0)  # AI-calculated match score (0-100)
    scouted_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default='new')  # new, saved, dismissed
    
    def to_dict(self):
        return {
            "id": self.id,
            "external_id": self.external_id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "description": self.description,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "contract_type": self.contract_type,
            "redirect_url": self.redirect_url,
            "relevance_score": self.relevance_score,
            "scouted_at": self.scouted_at.isoformat() if self.scouted_at else None,
            "status": self.status
        }
