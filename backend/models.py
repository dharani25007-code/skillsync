from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, Date
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
    user_id = Column(Integer, nullable=False, unique=True, index=True)

    # ── Basic Profile ──────────────────────────────────────────
    headline = Column(String)               # "Backend Engineer | Python, ML"
    summary = Column(Text)                  # Full professional bio
    location = Column(String)               # City
    country = Column(String)                # Country
    phone = Column(String)                  # Phone number
    date_of_birth = Column(Date)            # DOB
    gender = Column(String)                 # Male/Female/Other/Prefer not to say
    profile_photo_url = Column(String)      # Profile picture URL
    linkedin_url = Column(String)           # LinkedIn profile
    github_url = Column(String)             # GitHub profile
    portfolio_url = Column(String)          # Personal website/portfolio

    # ── Job Preferences ────────────────────────────────────────
    current_title = Column(String)          # Current job title
    current_company = Column(String)        # Current company
    current_company_size = Column(String)   # 1-10, 11-50 etc.
    current_industry = Column(String)       # Industry sector
    preferred_role = Column(String)         # What job they want
    years_of_experience = Column(Float)     # Total years
    expected_salary_min = Column(Float)     # Min expected salary (LPA)
    expected_salary_max = Column(Float)     # Max expected salary (LPA)
    notice_period_days = Column(Integer)    # Notice period in days
    preferred_work_mode = Column(String)    # remote/hybrid/onsite/flexible
    willing_to_relocate = Column(Boolean, default=False)
    open_to_work = Column(Boolean, default=True)

    # ── Structured Data (JSON arrays) ──────────────────────────
    skills = Column(JSON, default=list)
    # [{name, proficiency, endorsements, duration_months, exam_score}]

    experience = Column(JSON, default=list)
    # [{company, title, start_date, end_date, duration_months,
    #   is_current, industry, company_size, description}]

    education = Column(JSON, default=list)
    # [{institution, degree, field_of_study, start_year,
    #   end_year, grade, tier}]

    certifications = Column(JSON, default=list)
    # [{name, issuer, year, credential_url}]

    languages = Column(JSON, default=list)
    # [{language, proficiency}]

    projects = Column(JSON, default=list)
    # [{title, description, tech_stack, url, year}]

    # ── AI Exam Scores (SkillSync Unique!) ─────────────────────
    skill_assessment_scores = Column(JSON, default=dict)
    # {skill_name: score}  e.g. {"Python": 92.0, "NLP": 78.5}

    # ── Platform Signals (auto-collected) ──────────────────────
    profile_completeness_score = Column(Float, default=0.0)
    signup_date = Column(Date)
    last_active_date = Column(Date)
    profile_views_received_30d = Column(Integer, default=0)
    applications_submitted_30d = Column(Integer, default=0)
    recruiter_response_rate = Column(Float, default=0.0)
    avg_response_time_hours = Column(Float, default=0.0)
    connection_count = Column(Integer, default=0)
    endorsements_received = Column(Integer, default=0)
    github_activity_score = Column(Float, default=-1.0)
    search_appearance_30d = Column(Integer, default=0)
    saved_by_recruiters_30d = Column(Integer, default=0)
    interview_completion_rate = Column(Float, default=0.0)
    offer_acceptance_rate = Column(Float, default=-1.0)
    verified_email = Column(Boolean, default=False)
    verified_phone = Column(Boolean, default=False)
    linkedin_connected = Column(Boolean, default=False)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    company_name = Column(String)
    company_size = Column(String)
    industry = Column(String)
    website = Column(String)
    location = Column(String)
    about = Column(Text)
    logo_url = Column(String)
    verified = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())


class JobPost(Base):
    __tablename__ = "job_posts"
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list)
    experience_min = Column(Float, default=0)
    experience_max = Column(Float, default=20)
    location = Column(String)
    work_mode = Column(String)
    salary_min = Column(Float)
    salary_max = Column(Float)
    industry = Column(String)
    status = Column(String, default="active")  # active/closed
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RankingResult(Base):
    __tablename__ = "ranking_results"
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, nullable=False, index=True)
    job_post_id = Column(Integer)
    jd_text = Column(Text)
    dataset_source = Column(String)  # "skillsync" / "hackathon" / "upload"
    results = Column(JSON, default=list)
    # [{candidate_id, rank, score, reasoning, name, title}]
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SkillExamAttempt(Base):
    __tablename__ = "skill_exam_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    skill_name = Column(String, nullable=False)
    score = Column(Float)
    total_questions = Column(Integer)
    correct_answers = Column(Integer)
    time_taken_seconds = Column(Integer)
    passed = Column(Boolean, default=False)
    questions = Column(JSON, default=list)
    answers = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class JobApplication(Base):
    __tablename__ = "job_applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    cover_letter = Column(Text)
    resume_filename = Column(String)
    resume_path = Column(String)
    queries = Column(JSON, default=list) # [{'sender': 'seeker'/'recruiter', 'name': str, 'message': str, 'created_at': str}]
    created_at = Column(DateTime(timezone=True), server_default=func.now())