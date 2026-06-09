from pydantic import BaseModel
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    jobseeker = "jobseeker"
    recruiter = "recruiter"


class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    user_id: int