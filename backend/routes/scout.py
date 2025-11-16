import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models_scout import ScoutedJob
from models_extended import Resume
from models import Job
from models_user import User
from schemas_scout import ScoutSearchRequest, ScoutedJobResponse, JobActionRequest
from routes.auth import get_current_user
from openai import OpenAI
from datetime import datetime

router = APIRouter()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Adzuna API credentials
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_API_KEY = os.getenv("ADZUNA_API_KEY")
ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs"

def extract_job_keywords(resume_text: str) -> dict:
    """Use GPT to extract key job search terms from resume"""
    try:
        prompt = f"""Analyze this resume and extract:
1. Primary job title/role (e.g., "Software Engineer", "Data Analyst")
2. Top 5 key skills (comma-separated)
3. Years of experience level (entry/mid/senior)

Resume: {resume_text[:2000]}

Return ONLY in this exact format:
ROLE: [job title]
SKILLS: [skill1, skill2, skill3, skill4, skill5]
LEVEL: [entry/mid/senior]"""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=150
        )
        
        content = response.choices[0].message.content.strip()
        lines = content.split('\n')
        
        result = {"role": "", "skills": "", "level": ""}
        for line in lines:
            if line.startswith("ROLE:"):
                result["role"] = line.replace("ROLE:", "").strip()
            elif line.startswith("SKILLS:"):
                result["skills"] = line.replace("SKILLS:", "").strip()
            elif line.startswith("LEVEL:"):
                result["level"] = line.replace("LEVEL:", "").strip()
        
        return result
    except Exception as e:
        print(f"Error extracting keywords: {e}")
        return {"role": "Software Engineer", "skills": "Python, JavaScript", "level": "mid"}

def calculate_relevance_score(resume_text: str, job_description: str, job_title: str) -> float:
    """Use GPT to calculate how well the job matches the resume"""
    try:
        prompt = f"""Rate this job match from 0-100 based on resume alignment.

Resume Summary: {resume_text[:1500]}

Job Title: {job_title}
Job Description: {job_description[:1000]}

Consider:
- Skills match
- Experience level fit
- Domain relevance
- Role alignment

Return ONLY a number between 0-100."""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=10
        )
        
        score_text = response.choices[0].message.content.strip()
        score = float(score_text)
        return max(0, min(100, score))  # Clamp between 0-100
    except Exception as e:
        print(f"Error calculating score: {e}")
        return 50.0  # Default middle score

@router.post("/scout/search", response_model=List[ScoutedJobResponse])
async def search_jobs(
    request: ScoutSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search for jobs based on user's resume and return AI-scored matches"""
    try:
        # Get user's most recent resume
        resume = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).order_by(Resume.uploaded_at.desc()).first()
        
        if not resume:
            raise HTTPException(status_code=404, detail="No resume found. Please upload a resume first.")
        
        # Extract keywords from resume
        keywords = extract_job_keywords(resume.content)
        search_query = keywords["role"]
        
        # Build Adzuna API URL
        url = f"{ADZUNA_BASE_URL}/{request.country}/search/1"
        params = {
            "app_id": ADZUNA_APP_ID,
            "app_key": ADZUNA_API_KEY,
            "results_per_page": request.max_results,
            "what": search_query,
            "content-type": "application/json"
        }
        
        if request.location:
            params["where"] = request.location
        
        # Call Adzuna API
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        jobs_data = data.get("results", [])
        
        if not jobs_data:
            return []
        
        # Process and score jobs
        scouted_jobs = []
        for job in jobs_data[:request.max_results]:
            # Calculate relevance score
            score = calculate_relevance_score(
                resume.content,
                job.get("description", ""),
                job.get("title", "")
            )
            
            # Create scouted job record
            scouted_job = ScoutedJob(
                user_id=current_user.id,
                external_id=job.get("id", ""),
                title=job.get("title", "Unknown Title"),
                company=job.get("company", {}).get("display_name", "Unknown Company"),
                location=job.get("location", {}).get("display_name", ""),
                description=job.get("description", "")[:5000],  # Limit description length
                salary_min=job.get("salary_min"),  # Keep as float from Adzuna API
                salary_max=job.get("salary_max"),  # Keep as float from Adzuna API
                contract_type=job.get("contract_type"),
                redirect_url=job.get("redirect_url", ""),
                relevance_score=score,
                status="new"
            )
            
            db.add(scouted_job)
            scouted_jobs.append(scouted_job)
        
        db.commit()
        
        # Refresh and sort by relevance score
        for job in scouted_jobs:
            db.refresh(job)
        
        scouted_jobs.sort(key=lambda x: x.relevance_score, reverse=True)
        
        return scouted_jobs
        
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Job search service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching jobs: {str(e)}")

@router.get("/scout/jobs", response_model=List[ScoutedJobResponse])
async def get_scouted_jobs(
    status: str = "new",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's scouted jobs filtered by status"""
    jobs = db.query(ScoutedJob).filter(
        ScoutedJob.user_id == current_user.id,
        ScoutedJob.status == status
    ).order_by(ScoutedJob.relevance_score.desc()).all()
    
    return jobs

@router.post("/scout/jobs/{job_id}/action")
async def perform_job_action(
    job_id: int,
    action_request: JobActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save or dismiss a scouted job"""
    scouted_job = db.query(ScoutedJob).filter(
        ScoutedJob.id == job_id,
        ScoutedJob.user_id == current_user.id
    ).first()
    
    if not scouted_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if action_request.action == "save":
        # Get the user's main session_id from the most recent job
        # This ensures Scout jobs appear in the same list as manually added jobs
        existing_job = db.query(Job).filter(
            Job.user_id == current_user.id
        ).order_by(Job.scraped_at.desc()).first()
        
        if existing_job:
            session_id = existing_job.session_id
        else:
            # If user has no jobs, use a default session format
            # Frontend will see this and adopt it
            import time
            import random
            session_id = f"session_{int(time.time() * 1000)}_{random.randint(1000000, 9999999)}"
        
        # Create a regular job entry
        new_job = Job(
            user_id=current_user.id,
            session_id=session_id,
            url=scouted_job.redirect_url,
            source="scout",
            job_title=scouted_job.title,
            company_name=scouted_job.company,
            location=scouted_job.location,
            job_description=scouted_job.description or "",
            is_scraped=False,
            stage="found"
        )
        db.add(new_job)
        scouted_job.status = "saved"
        
    elif action_request.action == "dismiss":
        scouted_job.status = "dismissed"
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'save' or 'dismiss'")
    
    db.commit()
    
    return {"message": f"Job {action_request.action}d successfully"}

@router.delete("/scout/jobs/{job_id}")
async def delete_scouted_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a scouted job"""
    scouted_job = db.query(ScoutedJob).filter(
        ScoutedJob.id == job_id,
        ScoutedJob.user_id == current_user.id
    ).first()
    
    if not scouted_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(scouted_job)
    db.commit()
    
    return {"message": "Job deleted successfully"}
