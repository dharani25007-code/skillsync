from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import JobSeekerProfile, RecruiterProfile
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from datetime import date, datetime
import os

load_dotenv()

router = APIRouter(prefix="/profile", tags=["Profile"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Job Seeker Profile Schema ──────────────────────────────────

class JobSeekerProfileData(BaseModel):
    # Basic Info
    headline: Optional[str] = ""
    summary: Optional[str] = ""
    location: Optional[str] = ""
    country: Optional[str] = ""
    phone: Optional[str] = ""
    date_of_birth: Optional[str] = None
    gender: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    github_url: Optional[str] = ""
    portfolio_url: Optional[str] = ""

    # Job Preferences
    current_title: Optional[str] = ""
    current_company: Optional[str] = ""
    current_company_size: Optional[str] = ""
    current_industry: Optional[str] = ""
    preferred_role: Optional[str] = ""
    years_of_experience: Optional[float] = 0.0
    expected_salary_min: Optional[float] = 0.0
    expected_salary_max: Optional[float] = 0.0
    notice_period_days: Optional[int] = 30
    preferred_work_mode: Optional[str] = "flexible"
    willing_to_relocate: Optional[bool] = False
    open_to_work: Optional[bool] = True

    # Structured Data
    skills: Optional[List[Dict[str, Any]]] = []
    experience: Optional[List[Dict[str, Any]]] = []
    education: Optional[List[Dict[str, Any]]] = []
    certifications: Optional[List[Dict[str, Any]]] = []
    languages: Optional[List[Dict[str, Any]]] = []
    projects: Optional[List[Dict[str, Any]]] = []


# ── Recruiter Profile Schema ───────────────────────────────────

class RecruiterProfileData(BaseModel):
    company_name: Optional[str] = ""
    company_size: Optional[str] = ""
    industry: Optional[str] = ""
    website: Optional[str] = ""
    location: Optional[str] = ""
    about: Optional[str] = ""


# ── Helper: Calculate Profile Completeness ────────────────────

def calculate_completeness(data: dict) -> float:
    fields = [
        "headline", "summary", "location", "phone",
        "current_title", "preferred_role", "years_of_experience",
        "linkedin_url", "github_url"
    ]
    list_fields = ["skills", "experience", "education", "certifications", "languages"]

    score = 0
    total = len(fields) + len(list_fields)

    for f in fields:
        if data.get(f):
            score += 1

    for f in list_fields:
        if data.get(f) and len(data.get(f, [])) > 0:
            score += 1

    return round((score / total) * 100, 1)


# ── Job Seeker Profile Endpoints ───────────────────────────────

@router.post("/jobseeker")
def save_jobseeker_profile(
    data: JobSeekerProfileData,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    profile = db.query(JobSeekerProfile).filter(
        JobSeekerProfile.user_id == user_id
    ).first()

    completeness = calculate_completeness(data.dict())

    if profile:
        # Update existing
        for key, value in data.dict().items():
            if hasattr(profile, key):
                setattr(profile, key, value)
        profile.profile_completeness_score = completeness
        profile.last_active_date = date.today()
    else:
        # Create new
        profile = JobSeekerProfile(
            user_id=user_id,
            profile_completeness_score=completeness,
            signup_date=date.today(),
            last_active_date=date.today(),
            **{k: v for k, v in data.dict().items() if hasattr(JobSeekerProfile, k)}
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return {
        "message": "Profile saved successfully!",
        "completeness": completeness
    }


@router.get("/jobseeker")
def get_jobseeker_profile(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    profile = db.query(JobSeekerProfile).filter(
        JobSeekerProfile.user_id == user_id
    ).first()
    if not profile:
        return {}
    return profile


@router.get("/jobseeker/all")
def get_all_jobseekers(db: Session = Depends(get_db)):
    """Get all job seeker profiles for ranking (recruiter use)"""
    profiles = db.query(JobSeekerProfile).all()
    return profiles


# ── Recruiter Profile Endpoints ────────────────────────────────

@router.post("/recruiter")
def save_recruiter_profile(
    data: RecruiterProfileData,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    profile = db.query(RecruiterProfile).filter(
        RecruiterProfile.user_id == user_id
    ).first()

    if profile:
        for key, value in data.dict().items():
            if hasattr(profile, key):
                setattr(profile, key, value)
    else:
        profile = RecruiterProfile(
            user_id=user_id,
            **data.dict()
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return {"message": "Recruiter profile saved!"}


@router.get("/recruiter")
def get_recruiter_profile(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    profile = db.query(RecruiterProfile).filter(
        RecruiterProfile.user_id == user_id
    ).first()
    if not profile:
        return {}
    return profile