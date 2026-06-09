from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, profile, exam, ranking, jobs
import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SkillSync API",
    version="1.0.0",
    description="AI-Powered Verified Talent Matching Platform — Skills Verified. Talent Found."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(exam.router)
app.include_router(ranking.router)
app.include_router(jobs.router)

@app.get("/")
def root():
    return {
        "message": "SkillSync API is running! 🚀",
        "version": "1.0.0",
        "tagline": "Skills Verified. Talent Found."
    }

@app.get("/health")
def health():
    return {"status": "healthy", "api": "SkillSync"}