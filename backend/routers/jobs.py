from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import JobPost, JobSeekerProfile, JobApplication, User, RecruiterProfile
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
import os, time
from datetime import datetime

load_dotenv()

router = APIRouter(prefix="/jobs", tags=["Jobs"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
SECRET_KEY = os.getenv("SECRET_KEY", "skillsync-super-secret-key-2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


class JobPostCreate(BaseModel):
    title: str
    description: str
    required_skills: Optional[List[str]] = []
    experience_min: Optional[float] = 0
    experience_max: Optional[float] = 20
    location: Optional[str] = ""
    work_mode: Optional[str] = "flexible"
    salary_min: Optional[float] = 0
    salary_max: Optional[float] = 0
    industry: Optional[str] = ""



def match_score(job: dict, profile) -> float:
    """Calculate how well a job matches the user's profile"""
    if not profile:
        return 0.0

    user_skills = []
    if profile.skills:
        for s in profile.skills:
            if isinstance(s, dict):
                user_skills.append(s.get("name", "").lower())
            elif isinstance(s, str):
                user_skills.append(s.lower())

    required = [s.lower() for s in job.get("required_skills", [])]
    
    # Title matching
    job_title = (job.get("title") or "").lower()
    user_title = (profile.current_title or "").lower()
    user_pref = (profile.preferred_role or "").lower()
    
    title_match = False
    if job_title and (user_title or user_pref):
        job_words = [w for w in job_title.split() if len(w) >= 2]
        if job_words:
            title_match = any(w in user_title or w in user_pref for w in job_words)

    # 1. Skill Match Score (up to 0.7)
    skill_score = 0.0
    if required:
        matching = sum(1 for r in required if any(r in us or us in r for us in user_skills))
        skill_score = (matching / len(required)) * 0.7
    else:
        # If no required skills are specified, base it on title match
        skill_score = 0.5 if title_match else 0.0

    # If there are required skills but candidate matches 0 of them, and title also doesn't match, score should be 0.0
    if required and skill_score == 0.0 and not title_match:
        return 0.0

    # 2. Experience Match (up to 0.2)
    exp_score = 0.0
    years = float(profile.years_of_experience or 0)
    min_exp = job.get("experience_min", 0)
    max_exp = job.get("experience_max", 20)
    if min_exp <= years <= max_exp:
        exp_score = 0.2
    else:
        # Partial points if close
        diff = abs(years - ((min_exp + max_exp)/2))
        exp_score = max(0.0, 0.2 - (diff / 10) * 0.2)

    # 3. Work Mode Match (up to 0.1)
    mode_score = 0.0
    if profile.preferred_work_mode and job.get("work_mode"):
        if (profile.preferred_work_mode.lower() in job["work_mode"].lower() or 
            job["work_mode"].lower() in profile.preferred_work_mode.lower()):
            mode_score = 0.1

    total_score = skill_score + exp_score + mode_score
    
    # If the user has zero skills matched AND zero title overlap, return 0.0
    if skill_score == 0.0 and not title_match:
        return 0.0

    return round(min(total_score, 1.0), 2)


@router.get("/list")
def list_jobs(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Get all active jobs with match scores for the current user"""
    try:
        # Get user profile for matching
        profile = db.query(JobSeekerProfile).filter(
            JobSeekerProfile.user_id == user_id
        ).first()

        # Get jobs from DB
        db_jobs = db.query(JobPost).filter(JobPost.status == "active").all()

        result = []

        # Add DB jobs
        for job in db_jobs:
            applied = db.query(JobApplication).filter(
                JobApplication.job_id == job.id,
                JobApplication.user_id == user_id
            ).first() is not None

            # Look up the recruiter's company name
            recruiter_profile = db.query(RecruiterProfile).filter(
                RecruiterProfile.user_id == job.recruiter_id
            ).first()
            recruiter_user = db.query(User).filter(User.id == job.recruiter_id).first()
            company_name = (recruiter_profile.company_name if recruiter_profile and recruiter_profile.company_name
                            else recruiter_user.name if recruiter_user
                            else "Recruiter Company")

            # Calculate actual days since posting
            from datetime import datetime as dt
            posted_days = 1
            if job.created_at:
                try:
                    delta = dt.utcnow() - job.created_at.replace(tzinfo=None)
                    posted_days = max(0, delta.days)
                except Exception:
                    posted_days = 1

            job_dict = {
                "id": job.id,
                "recruiter_id": job.recruiter_id,
                "title": job.title,
                "company": company_name,
                "description": job.description,
                "required_skills": job.required_skills or [],
                "experience_min": job.experience_min,
                "experience_max": job.experience_max,
                "location": job.location or "India",
                "work_mode": job.work_mode or "Flexible",
                "salary_min": job.salary_min or 0,
                "salary_max": job.salary_max or 0,
                "industry": job.industry or "Technology",
                "status": "active",
                "posted_days_ago": posted_days,
                "source": "skillsync",
                "applied": applied
            }
            job_dict["match_score"] = match_score(job_dict, profile)
            result.append(job_dict)

        # Sort by match score
        result.sort(key=lambda x: x["match_score"], reverse=True)
        return result
    except Exception as e:
        print(f"Database error in /jobs/list: {e}")
        return []


@router.post("/post")
def post_job(
    job: JobPostCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Post a new job (recruiter only)"""
    new_job = JobPost(
        recruiter_id=user_id,
        title=job.title,
        description=job.description,
        required_skills=job.required_skills,
        experience_min=job.experience_min,
        experience_max=job.experience_max,
        location=job.location,
        work_mode=job.work_mode,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        industry=job.industry,
        status="active"
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return {"message": "Job posted successfully!", "job_id": new_job.id}


@router.get("/my-posts")
def my_job_posts(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Get all jobs posted by a recruiter"""
    return db.query(JobPost).filter(
        JobPost.recruiter_id == user_id
    ).order_by(JobPost.created_at.desc()).all()


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")


@router.post("/apply/{job_id}")
async def apply_to_job(
    job_id: int,
    cover_letter: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Apply to a job post with a resume/document (Job Seeker only)"""
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Create upload directory if it doesn't exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Secure the filename to prevent collision
    filename = f"{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Save the file locally
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save document: {str(e)}")

    # Save application record
    new_application = JobApplication(
        job_id=job_id,
        user_id=user_id,
        cover_letter=cover_letter,
        resume_filename=file.filename,
        resume_path=file_path
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return {"message": "Application submitted successfully!", "application_id": new_application.id}


@router.get("/applicants/{job_id}")
def view_job_applicants(
    job_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """View all applicants for a job post (Recruiter only)"""
    # Verify the job exists and belongs to the recruiter
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.recruiter_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view applicants for this job")

    applications = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
    
    result = []
    for app in applications:
        applicant = db.query(User).filter(User.id == app.user_id).first()
        profile = db.query(JobSeekerProfile).filter(JobSeekerProfile.user_id == app.user_id).first()
        
        result.append({
            "application_id": app.id,
            "user_id": app.user_id,
            "name": applicant.name if applicant else "Unknown Candidate",
            "email": applicant.email if applicant else "",
            "headline": profile.headline if profile else "",
            "years_of_experience": profile.years_of_experience if profile else 0,
            "cover_letter": app.cover_letter,
            "resume_filename": app.resume_filename,
            "queries": app.queries or [],
            "created_at": app.created_at
        })
        
    return result


@router.get("/download-resume/{application_id}")
def download_resume(
    application_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Download/view candidate resume"""
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Ensure the downloader is the job poster or the applicant
    job = db.query(JobPost).filter(JobPost.id == app.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Associated job not found")
        
    if job.recruiter_id != user_id and app.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to download this file")
        
    if not os.path.exists(app.resume_path):
        raise HTTPException(status_code=404, detail="Resume file not found on server")
        
    return FileResponse(app.resume_path, filename=app.resume_filename)


@router.get("/my-applications")
def my_applications(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Get all jobs that current job seeker applied to"""
    applications = db.query(JobApplication).filter(JobApplication.user_id == user_id).all()
    result = []
    for app in applications:
        job = db.query(JobPost).filter(JobPost.id == app.job_id).first()
        if job:
            result.append({
                "application_id": app.id,
                "job_id": job.id,
                "title": job.title,
                "company": "Recruiter Company",
                "cover_letter": app.cover_letter,
                "resume_filename": app.resume_filename,
                "queries": app.queries or [],
                "created_at": app.created_at
            })
    return result

class QueryCreate(BaseModel):
    message: str

@router.put("/edit/{job_id}")
def edit_job(
    job_id: int,
    job_in: JobPostCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Edit a job post (recruiter only)"""
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.recruiter_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this job")
        
    job.title = job_in.title
    job.description = job_in.description
    job.required_skills = job_in.required_skills
    job.experience_min = job_in.experience_min
    job.experience_max = job_in.experience_max
    job.location = job_in.location
    job.work_mode = job_in.work_mode
    job.salary_min = job_in.salary_min
    job.salary_max = job_in.salary_max
    job.industry = job_in.industry
    
    db.commit()
    db.refresh(job)
    return {"message": "Job updated successfully!"}


@router.delete("/delete/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Delete a job post (recruiter only)"""
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.recruiter_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")
        
    # Delete associated applications
    db.query(JobApplication).filter(JobApplication.job_id == job_id).delete()
    
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully!"}


@router.post("/applications/{application_id}/query")
def add_application_query(
    application_id: int,
    query_in: QueryCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Add a query/message to an application (Job Seeker or Recruiter)"""
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    # Check authorization
    job = db.query(JobPost).filter(JobPost.id == app.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    sender = db.query(User).filter(User.id == user_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="User not found")
        
    if app.user_id != user_id and job.recruiter_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to query this application")
        
    role = "seeker" if app.user_id == user_id else "recruiter"
    
    new_query = {
        "sender": role,
        "name": sender.name,
        "message": query_in.message,
        "created_at": datetime.utcnow().isoformat()
    }
    
    current_queries = list(app.queries or [])
    current_queries.append(new_query)
    
    app.queries = current_queries
    db.commit()
    db.refresh(app)
    
    return {"message": "Query sent successfully!", "queries": app.queries}