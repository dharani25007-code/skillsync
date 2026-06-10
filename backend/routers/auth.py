from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, JobSeekerProfile, RecruiterProfile
from schemas import UserRegister, UserLogin, TokenResponse
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "skillsync-super-secret-key-2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)


def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register", response_model=TokenResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(user.password)
    new_user = User(name=user.name, email=user.email, password=hashed, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto-initialize empty profiles
    if new_user.role == "jobseeker":
        profile = JobSeekerProfile(
            user_id=new_user.id,
            skills=[],
            experience=[],
            education=[],
            certifications=[],
            languages=[],
            projects=[]
        )
        db.add(profile)
        db.commit()
    elif new_user.role == "recruiter":
        profile = RecruiterProfile(user_id=new_user.id)
        db.add(profile)
        db.commit()

    token = create_token({"sub": str(new_user.id), "role": new_user.role})
    return TokenResponse(access_token=token, token_type="bearer",
                        role=new_user.role, name=new_user.name, user_id=new_user.id)


@router.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": str(db_user.id), "role": db_user.role})
    return TokenResponse(access_token=token, token_type="bearer",
                        role=db_user.role, name=db_user.name, user_id=db_user.id)


@router.get("/me")
def get_me(db: Session = Depends(get_db)):
    return {"message": "Auth working"}