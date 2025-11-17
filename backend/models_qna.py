from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from database import Base

class QnAItem(Base):
    __tablename__ = "qna_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)  # Optional job context
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    is_ai_generated = Column(Integer, default=0)  # 0 = manual, 1 = AI generated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "question": self.question,
            "answer": self.answer,
            "is_ai_generated": bool(self.is_ai_generated),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
