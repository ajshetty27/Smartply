import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models_qna import QnAItem
from models_extended import Resume
from models_user import User
from models import Job
from schemas_qna import QnACreate, QnAUpdate, QnAResponse
from routes.auth import get_current_user
from openai import OpenAI

router = APIRouter()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_answer_with_ai(question: str, resume_text: str = None, job_context: str = None) -> str:
    """Use GPT to generate an answer to a job application question"""
    try:
        context = ""
        if resume_text:
            context = f"\n\nCandidate's Resume Summary:\n{resume_text[:2000]}"
        if job_context:
            context += f"\n\nJob Context:\n{job_context}"
        
        prompt = f"""You are helping a job candidate answer a common job application question.

Question: {question}{context}

Provide a professional, thoughtful answer that:
- Is concise but complete (2-3 paragraphs max)
- Highlights relevant skills and experience
- Shows enthusiasm and cultural fit
- Is authentic and conversational
- Relates to the specific job context if provided

Answer:"""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating answer: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate answer with AI")

@router.get("/qna", response_model=List[QnAResponse])
async def get_qna_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all Q&A items for the current user"""
    items = db.query(QnAItem).filter(
        QnAItem.user_id == current_user.id
    ).order_by(QnAItem.created_at.desc()).all()
    
    return items

@router.post("/qna", response_model=QnAResponse)
async def create_qna_item(
    data: QnACreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new Q&A item"""
    # If generate_answer is True, use AI to generate the answer
    if data.generate_answer:
        # Try to get user's resume for context
        resume = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).order_by(Resume.uploaded_at.desc()).first()
        
        resume_text = resume.content if resume else None
        
        # Get job context if job_id is provided
        job_context = None
        if data.job_id:
            job = db.query(Job).filter(
                Job.id == data.job_id,
                Job.user_id == current_user.id
            ).first()
            if job:
                job_context = f"Job Title: {job.job_title}\nCompany: {job.company_name}\nLocation: {job.location or 'N/A'}\nDescription: {job.job_description[:500] if job.job_description else 'N/A'}"
        
        answer = generate_answer_with_ai(data.question, resume_text, job_context)
        is_ai_generated = 1
    else:
        if not data.answer:
            raise HTTPException(status_code=400, detail="Answer is required when not using AI generation")
        answer = data.answer
        is_ai_generated = 0
    
    qna_item = QnAItem(
        user_id=current_user.id,
        job_id=data.job_id,
        question=data.question,
        answer=answer,
        is_ai_generated=is_ai_generated
    )
    
    db.add(qna_item)
    db.commit()
    db.refresh(qna_item)
    
    return qna_item

@router.put("/qna/{qna_id}", response_model=QnAResponse)
async def update_qna_item(
    qna_id: int,
    data: QnAUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a Q&A item"""
    qna_item = db.query(QnAItem).filter(
        QnAItem.id == qna_id,
        QnAItem.user_id == current_user.id
    ).first()
    
    if not qna_item:
        raise HTTPException(status_code=404, detail="Q&A item not found")
    
    if data.question is not None:
        qna_item.question = data.question
    
    if data.answer is not None:
        qna_item.answer = data.answer
        qna_item.is_ai_generated = 0  # Mark as manually edited
    
    db.commit()
    db.refresh(qna_item)
    
    return qna_item

@router.delete("/qna/{qna_id}")
async def delete_qna_item(
    qna_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a Q&A item"""
    qna_item = db.query(QnAItem).filter(
        QnAItem.id == qna_id,
        QnAItem.user_id == current_user.id
    ).first()
    
    if not qna_item:
        raise HTTPException(status_code=404, detail="Q&A item not found")
    
    db.delete(qna_item)
    db.commit()
    
    return {"message": "Q&A item deleted successfully"}

@router.post("/qna/{qna_id}/regenerate", response_model=QnAResponse)
async def regenerate_answer(
    qna_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Regenerate answer using AI"""
    qna_item = db.query(QnAItem).filter(
        QnAItem.id == qna_id,
        QnAItem.user_id == current_user.id
    ).first()
    
    if not qna_item:
        raise HTTPException(status_code=404, detail="Q&A item not found")
    
    # Get user's resume for context
    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).order_by(Resume.uploaded_at.desc()).first()
    
    resume_text = resume.content if resume else None
    
    # Get job context if job_id is stored
    job_context = None
    if qna_item.job_id:
        job = db.query(Job).filter(
            Job.id == qna_item.job_id,
            Job.user_id == current_user.id
        ).first()
        if job:
            job_context = f"Job Title: {job.job_title}\nCompany: {job.company_name}\nLocation: {job.location or 'N/A'}\nDescription: {job.job_description[:500] if job.job_description else 'N/A'}"
    
    new_answer = generate_answer_with_ai(qna_item.question, resume_text, job_context)
    
    qna_item.answer = new_answer
    qna_item.is_ai_generated = 1
    
    db.commit()
    db.refresh(qna_item)
    
    return qna_item
