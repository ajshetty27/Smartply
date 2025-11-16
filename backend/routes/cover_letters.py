from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
import pdfplumber
import os
import io
from datetime import datetime
from database import get_db
from models_extended import Resume, CoverLetter
from models import Job
from models_profile import UserProfile
from models_user import User
from schemas_extended import ResumeResponse, CoverLetterGenerate, CoverLetterResponse
from openai import OpenAI
from dotenv import load_dotenv
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT
from auth import get_current_user

load_dotenv()

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    import io
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n"
            return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {str(e)}")

@router.post("/resumes/upload", response_model=ResumeResponse)
async def upload_resume(
    session_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and parse a resume PDF"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Read file content
        content = await file.read()
        
        # Extract text from PDF
        resume_text = extract_text_from_pdf(content)
        
        if not resume_text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Save resume to database with PDF content and user_id
        resume = Resume(
            session_id=session_id,
            user_id=current_user.id,
            filename=file.filename,
            content=resume_text,
            pdf_content=content  # Store raw PDF bytes
        )
        
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        return resume
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")

@router.get("/resumes/{session_id}", response_model=List[ResumeResponse])
async def get_resumes(
    session_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all resumes for a session"""
    resumes = db.query(Resume).filter(
        Resume.session_id == session_id,
        Resume.user_id == current_user.id
    ).order_by(Resume.uploaded_at.desc()).all()
    return resumes

@router.get("/resumes/{session_id}/base", response_model=ResumeResponse)
async def get_base_resume(
    session_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the most recent resume as the base resume for a session"""
    resume = db.query(Resume).filter(
        Resume.session_id == session_id,
        Resume.user_id == current_user.id
    ).order_by(Resume.uploaded_at.desc()).first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume found")
    return resume

@router.get("/resumes/{session_id}/pdf")
async def get_resume_pdf(
    session_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the PDF file for the base resume"""
    import logging
    logger = logging.getLogger(__name__)
    
    resume = db.query(Resume).filter(
        Resume.session_id == session_id,
        Resume.user_id == current_user.id
    ).order_by(Resume.uploaded_at.desc()).first()
    
    logger.info(f"PDF request for session: {session_id}")
    logger.info(f"Resume found: {resume is not None}")
    
    if resume:
        logger.info(f"Resume ID: {resume.id}, Filename: {resume.filename}")
        logger.info(f"PDF content exists: {resume.pdf_content is not None}")
        if resume.pdf_content:
            logger.info(f"PDF content size: {len(resume.pdf_content)}")
    
    if not resume or not resume.pdf_content:
        logger.error("Resume or PDF content not found")
        raise HTTPException(status_code=404, detail="Resume PDF not found")
    
    return Response(
        content=resume.pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={resume.filename}"
        }
    )

@router.post("/cover-letters/generate", response_model=CoverLetterResponse)
async def generate_cover_letter(
    data: CoverLetterGenerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a cover letter using GPT-5"""
    try:
        # Get job details (verify it belongs to the user)
        job = db.query(Job).filter(
            Job.id == data.job_id,
            Job.user_id == current_user.id
        ).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Get resume (verify it belongs to the user)
        resume = db.query(Resume).filter(
            Resume.id == data.resume_id,
            Resume.user_id == current_user.id
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Get user profile
        user_profile = db.query(UserProfile).filter(UserProfile.session_id == data.session_id).first()
        
        # Prepare system prompt
        # Build candidate info for the letter
        candidate_name = user_profile.full_name if user_profile and user_profile.full_name else "[Your Name]"
        candidate_email = user_profile.email if user_profile and user_profile.email else ""
        candidate_phone = user_profile.phone if user_profile and user_profile.phone else ""
        candidate_location = user_profile.location if user_profile and user_profile.location else ""
        
        system_prompt = """You are an expert cover letter writer. Create a professional, compelling cover letter that:
1. Highlights relevant experience from the resume that matches the job requirements
2. Shows genuine interest in the company and role
3. Uses a formal yet personable tone
4. Is well-structured with clear paragraphs
5. Is approximately 300-400 words

Format the cover letter properly with:
- Opening greeting (Dear Hiring Manager,)
- 3-4 body paragraphs
- Professional closing (Sincerely,)
- Candidate name and contact information at the end

IMPORTANT: Use the candidate's actual name and contact information provided. Do not use placeholders."""

        if data.additional_prompt:
            system_prompt += f"\n\nAdditional instructions: {data.additional_prompt}"
        
        # Prepare user prompt
        contact_info = f"""
CANDIDATE INFORMATION:
Name: {candidate_name}"""
        
        if candidate_email:
            contact_info += f"\nEmail: {candidate_email}"
        if candidate_phone:
            contact_info += f"\nPhone: {candidate_phone}"
        if candidate_location:
            contact_info += f"\nLocation: {candidate_location}"
        
        user_prompt = f"""Generate a cover letter for the following job application:

JOB DETAILS:
Title: {job.job_title}
Company: {job.company_name}
Location: {job.location or 'Not specified'}

JOB DESCRIPTION:
{job.job_description}

{contact_info}

CANDIDATE'S RESUME:
{resume.content}

Please create a tailored cover letter that emphasizes the candidate's most relevant qualifications for this specific role. 
Use the candidate's name "{candidate_name}" in the closing signature, and include their contact information."""

        # Call GPT-4 API (GPT-5 not yet available)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        cover_letter_content = response.choices[0].message.content
        
        # Generate resume modifications
        resume_mod_prompt = f"""Analyze the following resume against the job description and provide specific suggestions for modifications.

JOB DESCRIPTION:
{job.job_description}

CANDIDATE'S RESUME:
{resume.content}

Provide your response as a JSON array of modification objects. Each object should have:
- "section": the resume section (e.g., "Experience", "Skills", "Education", "Summary")
- "type": one of "add", "modify", "remove", or "highlight"
- "suggestion": specific text or skill to add/modify/remove
- "reason": brief explanation of why this change helps match the job requirements

Format your response as valid JSON only, no other text."""

        resume_mod_response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert resume analyst. Provide specific, actionable suggestions to tailor a resume for a job. Always respond with valid JSON only."},
                {"role": "user", "content": resume_mod_prompt}
            ],
            temperature=0.5,
            max_tokens=1500
        )
        
        resume_modifications = resume_mod_response.choices[0].message.content
        
        # Save cover letter to database
        cover_letter = CoverLetter(
            job_id=data.job_id,
            resume_id=data.resume_id,
            session_id=data.session_id,
            content=cover_letter_content,
            resume_modifications=resume_modifications,
            additional_prompt=data.additional_prompt,
            user_id=current_user.id
        )
        
        db.add(cover_letter)
        
        # Automatically move job to "documents" stage
        job.stage = 'documents'
        
        db.commit()
        db.refresh(cover_letter)
        
        return cover_letter
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating cover letter: {str(e)}")

@router.get("/cover-letters/{cover_letter_id}", response_model=CoverLetterResponse)
async def get_cover_letter(
    cover_letter_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific cover letter"""
    cover_letter = db.query(CoverLetter).filter(
        CoverLetter.id == cover_letter_id,
        CoverLetter.user_id == current_user.id
    ).first()
    if not cover_letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return cover_letter

@router.get("/cover-letters/job/{job_id}", response_model=List[CoverLetterResponse])
async def get_cover_letters_for_job(
    job_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all cover letters for a specific job"""
    cover_letters = db.query(CoverLetter).filter(
        CoverLetter.job_id == job_id,
        CoverLetter.user_id == current_user.id
    ).order_by(CoverLetter.generated_at.desc()).all()
    return cover_letters

@router.delete("/cover-letters/{cover_letter_id}")
async def delete_cover_letter(
    cover_letter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific cover letter (does not delete the associated job)"""
    cover_letter = db.query(CoverLetter).filter(
        CoverLetter.id == cover_letter_id,
        CoverLetter.user_id == current_user.id
    ).first()
    
    if not cover_letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    
    db.delete(cover_letter)
    db.commit()
    
    return {"message": "Cover letter deleted successfully"}

@router.post("/cover-letters/{cover_letter_id}/edit")
async def edit_cover_letter(
    cover_letter_id: int,
    selected_text: str = Form(...),
    instruction: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Edit a section of the cover letter using AI"""
    try:
        cover_letter = db.query(CoverLetter).filter(
            CoverLetter.id == cover_letter_id,
            CoverLetter.user_id == current_user.id
        ).first()
        if not cover_letter:
            raise HTTPException(status_code=404, detail="Cover letter not found")
        
                # Call GPT-4 for editing (GPT-5 not yet available)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are editing a cover letter. Modify only the selected text based on the user's instruction. Return ONLY the modified text, nothing else."
                },
                {
                    "role": "user",
                    "content": f"Original text: {selected_text}\n\nInstruction: {instruction}\n\nProvide the modified text:"
                }
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        modified_text = response.choices[0].message.content.strip()
        
        # Normalize whitespace for better matching
        import re
        selected_normalized = ' '.join(selected_text.split())
        content_normalized = ' '.join(cover_letter.content.split())
        
        # Try direct replacement first
        if selected_text in cover_letter.content:
            updated_content = cover_letter.content.replace(selected_text, modified_text, 1)
        # If direct replacement fails, try normalized matching
        elif selected_normalized in content_normalized:
            # Find the actual text in the original content that matches the normalized selection
            words = selected_text.split()
            pattern = r'\s+'.join(re.escape(word) for word in words)
            updated_content = re.sub(pattern, modified_text, cover_letter.content, count=1)
        else:
            # Fallback: just append the modified text with context
            updated_content = cover_letter.content + f"\n\n[EDIT: {modified_text}]"
        
        cover_letter.content = updated_content
        
        db.commit()
        db.refresh(cover_letter)
        
        return {
            "original_text": selected_text,
            "modified_text": modified_text,
            "full_content": updated_content
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error editing cover letter: {str(e)}")

@router.get("/cover-letters/{cover_letter_id}/pdf")
async def download_cover_letter_pdf(
    cover_letter_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and download cover letter as PDF"""
    try:
        # Get cover letter
        cover_letter = db.query(CoverLetter).filter(
            CoverLetter.id == cover_letter_id,
            CoverLetter.user_id == current_user.id
        ).first()
        if not cover_letter:
            raise HTTPException(status_code=404, detail="Cover letter not found")
        
        # Get job details for filename
        job = db.query(Job).filter(
            Job.id == cover_letter.job_id,
            Job.user_id == current_user.id
        ).first()
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch
        )
        
        # Container for PDF elements
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            alignment=TA_LEFT,
            spaceAfter=12
        )
        
        # Split content into paragraphs and add to PDF
        paragraphs = cover_letter.content.split('\n')
        for para in paragraphs:
            if para.strip():  # Only add non-empty paragraphs
                # Replace special characters that might cause issues
                para_text = para.strip().replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                p = Paragraph(para_text, normal_style)
                elements.append(p)
                elements.append(Spacer(1, 0.1 * inch))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()
        
        # Create filename
        company_name = job.company_name.replace(' ', '_') if job else 'Company'
        job_title = job.job_title.replace(' ', '_') if job else 'Position'
        filename = f"CoverLetter_{company_name}_{job_title}.pdf"
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
