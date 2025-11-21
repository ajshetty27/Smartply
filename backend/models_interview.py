from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from datetime import datetime
from database import Base

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    voice = Column(String, default="alloy")  # OpenAI voice: alloy (male), shimmer (female)
    call_id = Column(String, nullable=True)  # WebRTC call ID from OpenAI
    status = Column(String, default="pending")  # pending, active, completed, error
    duration_seconds = Column(Integer, default=0)
    conversation_history = Column(Text, nullable=True)  # JSON-encoded message history
    transcript = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "resume_id": self.resume_id,
            "voice": self.voice,
            "call_id": self.call_id,
            "status": self.status,
            "duration_seconds": self.duration_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }
