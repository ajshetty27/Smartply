from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Job
from models_linkedin import LinkedInCredentials
from models_user import User
from schemas import JobURLSubmit, JobManualSubmit, JobResponse
from scraper import JobScraper
from auth import get_current_user
import asyncio

router = APIRouter()

@router.post("/jobs/url", response_model=JobResponse)
async def submit_job_url(
    job_data: JobURLSubmit, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a job URL for scraping"""
    try:
        # Get LinkedIn credentials if they exist
        linkedin_cookies = {}
        credentials = db.query(LinkedInCredentials).filter(
            LinkedInCredentials.session_id == job_data.session_id
        ).first()
        
        if credentials:
            linkedin_cookies = {
                'li_at': credentials.li_at_cookie
            }
            if credentials.jsessionid_cookie:
                linkedin_cookies['JSESSIONID'] = credentials.jsessionid_cookie
        
        # Create scraper with credentials
        scraper = JobScraper(linkedin_cookies=linkedin_cookies)
        
        # Scrape the job (this might take a few seconds)
        scraped_data = scraper.scrape_job(job_data.url)
        
        if not scraped_data:
            raise HTTPException(
                status_code=400, 
                detail="LinkedIn scraping failed. Please use the 'Manual Entry' tab to copy and paste the job details directly."
            )
        
        # Create job entry with user_id
        job = Job(
            session_id=job_data.session_id,
            user_id=current_user.id,
            url=job_data.url,
            source=scraped_data.get('source', 'unknown'),
            job_title=scraped_data['job_title'],
            company_name=scraped_data['company_name'],
            location=scraped_data.get('location'),
            job_description=scraped_data['job_description'],
            is_scraped=True
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        return job
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
            raise HTTPException(
                status_code=500, 
                detail="LinkedIn page took too long to load. Please try again or use the 'Manual Entry' tab to paste the job details directly."
            )
        raise HTTPException(status_code=500, detail=f"Error processing job: {error_msg}")

@router.post("/jobs/manual", response_model=JobResponse)
async def submit_job_manual(
    job_data: JobManualSubmit, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a job manually with copy-pasted information"""
    try:
        job = Job(
            session_id=job_data.session_id,
            user_id=current_user.id,
            url=None,
            source="manual",
            job_title=job_data.job_title,
            company_name=job_data.company_name,
            location=job_data.location,
            job_description=job_data.job_description,
            is_scraped=False
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        return job
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving job: {str(e)}")

@router.get("/jobs/{session_id}", response_model=List[JobResponse])
async def get_jobs(
    session_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all jobs for a session"""
    jobs = db.query(Job).filter(
        Job.session_id == session_id,
        Job.user_id == current_user.id
    ).order_by(Job.scraped_at.desc()).all()
    return jobs

@router.get("/jobs/{session_id}/with-cover-letters", response_model=List[JobResponse])
async def get_jobs_with_cover_letters(
    session_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all jobs that have cover letters generated"""
    from models_extended import CoverLetter
    from sqlalchemy import exists
    
    jobs = db.query(Job).filter(
        Job.session_id == session_id,
        Job.user_id == current_user.id,
        exists().where(CoverLetter.job_id == Job.id)
    ).order_by(Job.scraped_at.desc()).all()
    
    return jobs

@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a job"""
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully"}

@router.patch("/jobs/{job_id}/stage")
async def update_job_stage(
    job_id: int,
    stage: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update job stage"""
    # Validate stage
    valid_stages = ['found', 'documents', 'applied', 'rejected', 'interview', 'accepted']
    if stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {', '.join(valid_stages)}")
    
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.stage = stage
    db.commit()
    db.refresh(job)
    
    return job
