from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for backward compatibility
    session_id = Column(String, index=True)
    filename = Column(String)
    content = Column(Text)  # Extracted text from PDF
    pdf_content = Column(LargeBinary, nullable=True)  # Raw PDF bytes
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    cover_letters = relationship("CoverLetter", back_populates="resume")

class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for backward compatibility
    job_id = Column(Integer, ForeignKey("jobs.id"))
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    session_id = Column(String, index=True)
    content = Column(Text)
    resume_modifications = Column(Text, nullable=True)  # JSON string with resume modification suggestions
    additional_prompt = Column(Text, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    resume = relationship("Resume", back_populates="cover_letters")
