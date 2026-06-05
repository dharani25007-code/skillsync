from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import JobSeekerProfile
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
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

class ProfileData(BaseModel):
    skills: Optional[List[str]] = []
    experience: Optional[List[dict]] = []
    education: Optional[List[dict]] = []
    certifications: Optional[List[str]] = []
    preferred_role: Optional[str] = ""
    location: Optional[str] = ""
    bio: Optional[str] = ""

@router.post("/jobseeker")
def save_profile(data: ProfileData, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    profile = db.query(JobSeekerProfile).filter(JobSeekerProfile.user_id == user_id).first()
    if profile:
        profile.skills = data.skills
        profile.experience = data.experience
        profile.education = data.education
        profile.certifications = data.certifications
        profile.preferred_role = data.preferred_role
        profile.location = data.location
        profile.bio = data.bio
    else:
        profile = JobSeekerProfile(
            user_id=user_id,
            skills=data.skills,
            experience=data.experience,
            education=data.education,
            certifications=data.certifications,
            preferred_role=data.preferred_role,
            location=data.location,
            bio=data.bio
        )
        db.add(profile)
    db.commit()
    return {"message": "Profile saved successfully!"}

@router.get("/jobseeker")
def get_profile(db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    profile = db.query(JobSeekerProfile).filter(JobSeekerProfile.user_id == user_id).first()
    if not profile:
        return {}
    return profile