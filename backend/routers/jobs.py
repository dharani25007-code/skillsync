from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import JobPost, JobSeekerProfile
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
import os

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


# Seed jobs for demo
SEED_JOBS = [
    {
        "id": 1,
        "recruiter_id": 0,
        "title": "Senior ML Engineer",
        "company": "Redrob AI",
        "description": "Build intelligent candidate discovery and ranking systems using state-of-the-art NLP and ML techniques. You will work on embedding models, vector search, and ranking algorithms.",
        "required_skills": ["Python", "Machine Learning", "NLP", "Embeddings", "FastAPI", "PyTorch"],
        "experience_min": 5,
        "experience_max": 9,
        "location": "Bangalore / Remote",
        "work_mode": "Remote",
        "salary_min": 25,
        "salary_max": 45,
        "industry": "AI / Recruitment Tech",
        "status": "active",
        "posted_days_ago": 2
    },
    {
        "id": 2,
        "recruiter_id": 0,
        "title": "Full Stack Developer",
        "company": "Freshworks",
        "description": "Build scalable web applications for our CRM platform. Work with React frontend and Node.js backend, deploy on AWS with PostgreSQL databases.",
        "required_skills": ["React", "Node.js", "PostgreSQL", "AWS", "TypeScript"],
        "experience_min": 3,
        "experience_max": 6,
        "location": "Chennai",
        "work_mode": "Hybrid",
        "salary_min": 15,
        "salary_max": 25,
        "industry": "SaaS / CRM",
        "status": "active",
        "posted_days_ago": 1
    },
    {
        "id": 3,
        "recruiter_id": 0,
        "title": "Data Scientist",
        "company": "PhonePe",
        "description": "Analyze payment data and build ML models to detect fraud and improve user experience. Work with large scale datasets using Spark and Python.",
        "required_skills": ["Python", "Machine Learning", "SQL", "Pandas", "Scikit-learn", "Spark"],
        "experience_min": 2,
        "experience_max": 5,
        "location": "Bangalore",
        "work_mode": "Onsite",
        "salary_min": 18,
        "salary_max": 30,
        "industry": "Fintech",
        "status": "active",
        "posted_days_ago": 3
    },
    {
        "id": 4,
        "recruiter_id": 0,
        "title": "Python Backend Developer",
        "company": "Zoho",
        "description": "Develop backend services for our suite of business software products. Build REST APIs, work with databases and deploy microservices.",
        "required_skills": ["Python", "Django", "REST API", "MySQL", "Docker", "Redis"],
        "experience_min": 2,
        "experience_max": 4,
        "location": "Chennai / Coimbatore",
        "work_mode": "Onsite",
        "salary_min": 10,
        "salary_max": 18,
        "industry": "Enterprise Software",
        "status": "active",
        "posted_days_ago": 5
    },
    {
        "id": 5,
        "recruiter_id": 0,
        "title": "AI/LLM Engineer",
        "company": "Sarvam AI",
        "description": "Build and deploy large language models for Indian languages. Work on fine-tuning, RLHF, and production deployment of LLMs at scale.",
        "required_skills": ["LLM", "Fine-tuning", "Python", "PyTorch", "Transformers", "RLHF"],
        "experience_min": 3,
        "experience_max": 7,
        "location": "Bangalore / Remote",
        "work_mode": "Remote",
        "salary_min": 20,
        "salary_max": 40,
        "industry": "AI Research",
        "status": "active",
        "posted_days_ago": 1
    },
    {
        "id": 6,
        "recruiter_id": 0,
        "title": "NLP Engineer",
        "company": "Swiggy",
        "description": "Build NLP systems for restaurant search, menu understanding, and customer support automation. Work on BERT-based models and Elasticsearch.",
        "required_skills": ["NLP", "Python", "BERT", "TensorFlow", "Elasticsearch", "FastAPI"],
        "experience_min": 3,
        "experience_max": 6,
        "location": "Bangalore",
        "work_mode": "Hybrid",
        "salary_min": 18,
        "salary_max": 32,
        "industry": "Food Tech",
        "status": "active",
        "posted_days_ago": 4
    },
    {
        "id": 7,
        "recruiter_id": 0,
        "title": "React Frontend Developer",
        "company": "CRED",
        "description": "Build beautiful, performant frontend experiences for our financial products. Work with React, TypeScript and modern CSS frameworks.",
        "required_skills": ["React", "TypeScript", "JavaScript", "CSS", "Git", "REST API"],
        "experience_min": 2,
        "experience_max": 5,
        "location": "Bangalore",
        "work_mode": "Hybrid",
        "salary_min": 15,
        "salary_max": 28,
        "industry": "Fintech",
        "status": "active",
        "posted_days_ago": 2
    },
    {
        "id": 8,
        "recruiter_id": 0,
        "title": "DevOps / MLOps Engineer",
        "company": "Razorpay",
        "description": "Build and maintain ML infrastructure, CI/CD pipelines, and Kubernetes clusters. Enable data scientists to deploy models at scale.",
        "required_skills": ["Docker", "Kubernetes", "AWS", "Python", "CI/CD", "MLOps", "Terraform"],
        "experience_min": 3,
        "experience_max": 7,
        "location": "Bangalore / Remote",
        "work_mode": "Remote",
        "salary_min": 20,
        "salary_max": 35,
        "industry": "Fintech",
        "status": "active",
        "posted_days_ago": 3
    },
]


def match_score(job: dict, profile) -> float:
    """Calculate how well a job matches the user's profile"""
    if not profile:
        return 0.5

    score = 0.5
    user_skills = []
    if profile.skills:
        for s in profile.skills:
            if isinstance(s, dict):
                user_skills.append(s.get("name", "").lower())
            elif isinstance(s, str):
                user_skills.append(s.lower())

    required = [s.lower() for s in job.get("required_skills", [])]
    if required:
        matching = sum(1 for r in required if any(r in us or us in r for us in user_skills))
        score = matching / len(required)

    # Experience match
    years = float(profile.years_of_experience or 0)
    min_exp = job.get("experience_min", 0)
    max_exp = job.get("experience_max", 20)
    if min_exp <= years <= max_exp:
        score += 0.2

    # Work mode match
    if profile.preferred_work_mode and job.get("work_mode"):
        if profile.preferred_work_mode.lower() in job["work_mode"].lower():
            score += 0.1

    return round(min(score, 1.0), 2)


@router.get("/list")
def list_jobs(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Get all active jobs with match scores for the current user"""
    # Get user profile for matching
    profile = db.query(JobSeekerProfile).filter(
        JobSeekerProfile.user_id == user_id
    ).first()

    # Get jobs from DB
    db_jobs = db.query(JobPost).filter(JobPost.status == "active").all()

    result = []

    # Add DB jobs
    for job in db_jobs:
        job_dict = {
            "id": job.id,
            "recruiter_id": job.recruiter_id,
            "title": job.title,
            "company": "Recruiter Company",
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
            "posted_days_ago": 1,
            "match_score": match_score({"required_skills": job.required_skills or []}, profile),
            "source": "skillsync"
        }
        result.append(job_dict)

    # Add seed/demo jobs
    for job in SEED_JOBS:
        job_copy = job.copy()
        job_copy["match_score"] = match_score(job, profile)
        job_copy["source"] = "featured"
        result.append(job_copy)

    # Sort by match score
    result.sort(key=lambda x: x["match_score"], reverse=True)
    return result


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