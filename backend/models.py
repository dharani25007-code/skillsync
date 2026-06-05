from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "jobseeker" or "recruiter"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class JobSeekerProfile(Base):
    __tablename__ = "jobseeker_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    skills = Column(JSON)
    experience = Column(JSON)
    education = Column(JSON)
    certifications = Column(JSON)
    preferred_role = Column(String)
    location = Column(String)
    bio = Column(Text)
    exam_scores = Column(JSON)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    company_name = Column(String)
    industry = Column(String)
    website = Column(String)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())