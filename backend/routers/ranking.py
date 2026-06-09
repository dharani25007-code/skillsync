from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import RankingResult, JobSeekerProfile
from pydantic import BaseModel
from typing import Optional
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
import os, json, re, httpx
from datetime import date, datetime

load_dotenv()

router = APIRouter(prefix="/ranking", tags=["Ranking"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
SECRET_KEY = os.getenv("SECRET_KEY", "skillsync-super-secret-key-2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token. Please login again.")


# ── JD Skill Extraction ────────────────────────────────────────
TECH_SKILLS = [
    "python", "machine learning", "deep learning", "nlp",
    "natural language processing", "embeddings", "vector database",
    "fastapi", "flask", "django", "react", "angular", "vue",
    "sql", "postgresql", "mysql", "mongodb", "redis",
    "data science", "tensorflow", "pytorch", "keras",
    "scikit-learn", "pandas", "numpy", "matplotlib",
    "docker", "kubernetes", "aws", "gcp", "azure", "git",
    "retrieval", "ranking", "search", "recommendation",
    "llm", "transformers", "bert", "gpt", "fine-tuning",
    "faiss", "pinecone", "elasticsearch", "weaviate",
    "spark", "kafka", "airflow", "hadoop", "data engineering",
    "javascript", "typescript", "node.js", "java", "c++",
    "computer vision", "opencv", "reinforcement learning",
    "statistics", "probability", "linear algebra", "calculus",
    "a/b testing", "mlops", "ci/cd", "rest api", "graphql"
]

BAD_TITLE_KEYWORDS = [
    "marketing manager", "sales executive", "hr manager",
    "human resources", "accountant", "graphic designer",
    "content writer", "operations manager", "finance manager",
    "civil engineer", "mechanical engineer", "electrical engineer",
    "customer support", "business development"
]

CONSULTING_FIRMS = [
    "tcs", "infosys", "wipro", "accenture", "cognizant",
    "capgemini", "hcl technologies", "tech mahindra", "mphasis",
    "hexaware", "mindtree", "l&t infotech"
]

PRODUCT_COMPANIES = [
    "google", "microsoft", "amazon", "meta", "apple", "netflix",
    "flipkart", "swiggy", "zomato", "razorpay", "freshworks",
    "zoho", "phonepe", "cred", "meesho", "uber", "airbnb",
    "openai", "anthropic", "huggingface", "databricks"
]


def extract_jd_requirements(jd_text: str) -> dict:
    jd_lower = jd_text.lower()
    required_skills = [s for s in TECH_SKILLS if s in jd_lower]
    exp_matches = re.findall(r'(\d+)\+?\s*(?:to\s*\d+\s*)?(?:years?|yrs?)', jd_lower)
    exp_nums = [int(x) for x in exp_matches if int(x) <= 30]
    min_exp = min(exp_nums) if exp_nums else 2
    max_exp = max(exp_nums) if exp_nums else 10
    return {
        "required_skills": required_skills,
        "min_exp": min_exp,
        "max_exp": max_exp
    }


def score_candidate_full(candidate: dict, jd_req: dict) -> dict:
    """
    Full 5-signal scoring matching rank.py logic
    Signal 1: Career Relevance (30%)
    Signal 2: Skills Depth (25%)
    Signal 3: Experience Years (15%)
    Signal 4: Behavioral Signals (20%)
    Signal 5: Education (10%)
    """
    required_skills = jd_req["required_skills"]
    min_exp = jd_req["min_exp"]
    max_exp = jd_req["max_exp"]

    # ── Signal 1: Career Relevance (30%) ─────────────────────
    career_score = 0.5
    title = (candidate.get("current_title") or "").lower()
    career = candidate.get("career_history", []) or []

    # Penalize bad titles
    if any(bad in title for bad in BAD_TITLE_KEYWORDS):
        career_score -= 0.3

    # Good title bonus
    good_title_words = ["engineer", "developer", "scientist", "researcher",
                        "analyst", "architect", "lead", "principal"]
    if any(g in title for g in good_title_words):
        career_score += 0.15

    # Career history analysis
    total_months = sum(j.get("duration_months", 0) for j in career)
    consulting_months = 0
    product_months = 0

    for job in career:
        company = (job.get("company") or "").lower()
        desc = (job.get("description") or "").lower()
        duration = job.get("duration_months", 0)

        if any(c in company for c in CONSULTING_FIRMS):
            consulting_months += duration
        if any(p in company for p in PRODUCT_COMPANIES):
            product_months += duration
            career_score += 0.08

        # Relevant work in description
        relevant_kw = ["ranking", "retrieval", "recommendation", "search",
                       "embeddings", "nlp", "machine learning", "ai system",
                       "ml pipeline", "llm", "rag", "vector"]
        if any(kw in desc for kw in relevant_kw):
            career_score += 0.05

    # Pure consulting penalty
    if total_months > 0:
        consulting_ratio = consulting_months / total_months
        if consulting_ratio > 0.8:
            career_score -= 0.25
        elif consulting_ratio > 0.5:
            career_score -= 0.1

    if product_months > 24:
        career_score += 0.1

    career_score = max(0.0, min(1.0, career_score))

    # ── Signal 2: Skills Depth (25%) ─────────────────────────
    skills = candidate.get("skills", []) or []
    exam_scores = candidate.get("skill_assessment_scores", {}) or {}

    relevant_skill_score = 0
    total_relevant = 0

    for skill in skills:
        name = (skill.get("name") if isinstance(skill, dict) else str(skill)).lower()
        proficiency = skill.get("proficiency", "beginner") if isinstance(skill, dict) else "beginner"
        endorsements = skill.get("endorsements", 0) if isinstance(skill, dict) else 0
        duration = skill.get("duration_months", 0) if isinstance(skill, dict) else 0

        is_relevant = any(req in name or name in req for req in required_skills)
        if not is_relevant:
            continue

        total_relevant += 1
        prof_score = {"beginner": 0.2, "intermediate": 0.5, "advanced": 0.8, "expert": 1.0}.get(proficiency, 0.3)
        endorse_bonus = min(endorsements / 50, 0.3)
        duration_bonus = min(duration / 48, 0.2)

        # Exam score bonus (SkillSync unique!)
        skill_name_orig = skill.get("name", "") if isinstance(skill, dict) else str(skill)
        exam_bonus = (exam_scores.get(skill_name_orig, 0) / 100 * 0.3)

        relevant_skill_score += min(prof_score + endorse_bonus + duration_bonus + exam_bonus, 1.5)

    if total_relevant == 0:
        skills_score = 0.05
    else:
        skills_score = min((relevant_skill_score / (total_relevant * 1.5)) * 0.7 + min(total_relevant / 10, 0.3), 1.0)

    # ── Signal 3: Experience Years (15%) ─────────────────────
    years = float(candidate.get("years_of_experience", 0) or 0)
    if 6 <= years <= 8:
        exp_score = 1.0
    elif min_exp <= years <= max_exp:
        exp_score = 0.9
    elif years < min_exp:
        exp_score = max(0.1, years / max(min_exp, 1))
    elif years <= 12:
        exp_score = 0.7
    else:
        exp_score = 0.4

    # ── Signal 4: Behavioral (20%) ────────────────────────────
    open_to_work = bool(candidate.get("open_to_work", False))
    response_rate = float(candidate.get("recruiter_response_rate", 0) or 0)
    github_score = float(candidate.get("github_activity_score", -1) or -1)
    interview_rate = float(candidate.get("interview_completion_rate", 0) or 0)
    notice_period = int(candidate.get("notice_period_days", 90) or 90)
    saved_30d = int(candidate.get("saved_by_recruiters_30d", 0) or 0)

    behavioral_score = 0.3
    if open_to_work:
        behavioral_score += 0.25
    behavioral_score += response_rate * 0.2

    # Last active date
    last_active = candidate.get("last_active_date", "2020-01-01")
    try:
        last_date = datetime.strptime(str(last_active)[:10], "%Y-%m-%d").date()
        days_inactive = (date(2026, 6, 7) - last_date).days
        if days_inactive <= 30:
            behavioral_score += 0.15
        elif days_inactive <= 90:
            behavioral_score += 0.08
        elif days_inactive > 365:
            behavioral_score -= 0.15
    except:
        pass

    if github_score > 0:
        behavioral_score += (github_score / 100) * 0.1
    behavioral_score += interview_rate * 0.05
    if notice_period <= 30:
        behavioral_score += 0.05
    if saved_30d > 5:
        behavioral_score += 0.05

    behavioral_score = max(0.0, min(1.0, behavioral_score))

    # ── Signal 5: Education (10%) ─────────────────────────────
    education = candidate.get("education", []) or []
    edu_score = 0.3
    for edu in education:
        tier = edu.get("tier", "unknown") if isinstance(edu, dict) else "unknown"
        field = (edu.get("field_of_study", "") if isinstance(edu, dict) else "").lower()
        degree = (edu.get("degree", "") if isinstance(edu, dict) else "").lower()

        tier_s = {"tier_1": 1.0, "tier_2": 0.8, "tier_3": 0.6, "tier_4": 0.4}.get(tier, 0.3)
        field_bonus = 0.2 if any(f in field for f in ["computer", "software", "data", "ai", "math", "statistics"]) else 0
        deg_bonus = 0.2 if any(d in degree for d in ["m.tech", "mtech", "m.s", "ms", "ph.d", "phd"]) else 0.1 if any(d in degree for d in ["b.tech", "btech", "b.e", "be"]) else 0

        edu_score = max(edu_score, min(tier_s + field_bonus + deg_bonus, 1.0))

    # ── Final Score ───────────────────────────────────────────
    final = (
        career_score * 0.30 +
        skills_score * 0.25 +
        exp_score * 0.15 +
        behavioral_score * 0.20 +
        edu_score * 0.10
    )

    # Build reasoning
    matching_skills = [
        (s.get("name") if isinstance(s, dict) else str(s))
        for s in skills
        if any(req in (s.get("name") if isinstance(s, dict) else str(s)).lower() for req in required_skills)
    ]
    reasoning = (
        f"{candidate.get('current_title', 'Professional')} | "
        f"{years:.1f} yrs exp | "
        f"{len(matching_skills)} matching skills"
        + (f" | open to work" if open_to_work else "")
        + (f" | exam verified" if exam_scores else "")
    )

    return {
        "score": round(max(0.0, min(1.0, final)), 4),
        "reasoning": reasoning,
        "signal_scores": {
            "career": round(career_score, 3),
            "skills": round(skills_score, 3),
            "experience": round(exp_score, 3),
            "behavioral": round(behavioral_score, 3),
            "education": round(edu_score, 3)
        }
    }


def score_from_db(profiles, jd_req):
    results = []
    for p in profiles:
        candidate = {
            "candidate_id": f"SS_{p.user_id}",
            "name": f"SkillSync User #{p.user_id}",
            "current_title": p.current_title or "Professional",
            "years_of_experience": p.years_of_experience or 0,
            "skills": p.skills or [],
            "open_to_work": p.open_to_work if p.open_to_work is not None else True,
            "location": p.location or "",
            "preferred_role": p.preferred_role or "",
            "skill_assessment_scores": p.skill_assessment_scores or {},
            "recruiter_response_rate": p.recruiter_response_rate or 0.5,
            "github_activity_score": p.github_activity_score or -1,
            "interview_completion_rate": p.interview_completion_rate or 0,
            "notice_period_days": p.notice_period_days or 30,
            "education": p.education or [],
            "career_history": p.experience or [],
            "last_active_date": str(p.last_active_date) if p.last_active_date else "2026-01-01",
        }
        result = score_candidate_full(candidate, jd_req)
        results.append({**candidate, **result})
    return results


class RankRequest(BaseModel):
    jd_text: str
    dataset_source: str
    top_n: Optional[int] = 20


@router.post("/rank")
async def rank_candidates(
    req: RankRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    jd_req = extract_jd_requirements(req.jd_text)
    candidates_scored = []

    # ── SkillSync Database ─────────────────────────────────────
    if req.dataset_source == "skillsync":
        profiles = db.query(JobSeekerProfile).all()
        if not profiles:
            return {
                "message": "No SkillSync candidates yet. Ask job seekers to register!",
                "results": [], "total_ranked": 0, "jd_requirements": jd_req
            }
        candidates_scored = score_from_db(profiles, jd_req)

    # ── INDIA RUNS Hackathon Dataset ───────────────────────────
    elif req.dataset_source == "hackathon":
        # Try multiple possible paths
        possible_paths = [
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "candidates.jsonl"),
            os.path.join(os.path.dirname(__file__), "..", "data", "candidates.jsonl"),
            "data/candidates.jsonl",
            "../data/candidates.jsonl",
        ]

        hackathon_file = None
        for path in possible_paths:
            normalized = os.path.normpath(path)
            if os.path.exists(normalized):
                hackathon_file = normalized
                break

        if not hackathon_file:
            raise HTTPException(
                status_code=404,
                detail=f"candidates.jsonl not found. Checked: {[os.path.normpath(p) for p in possible_paths]}"
            )

        print(f"✅ Loading hackathon dataset from: {hackathon_file}")
        count = 0
        with open(hackathon_file, encoding='utf-8') as f:
            for line in f:
                if count >= 10000:  # Process 10K for good coverage + speed
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    c = json.loads(line)
                    signals = c.get("redrob_signals", {})
                    profile = c.get("profile", {})
                    candidate = {
                        "candidate_id": c["candidate_id"],
                        "name": profile.get("anonymized_name", f"Candidate {count+1}"),
                        "current_title": profile.get("current_title", ""),
                        "years_of_experience": profile.get("years_of_experience", 0),
                        "skills": c.get("skills", []),
                        "education": c.get("education", []),
                        "career_history": c.get("career_history", []),
                        "open_to_work": signals.get("open_to_work_flag", False),
                        "location": profile.get("location", ""),
                        "recruiter_response_rate": signals.get("recruiter_response_rate", 0),
                        "github_activity_score": signals.get("github_activity_score", -1),
                        "interview_completion_rate": signals.get("interview_completion_rate", 0),
                        "notice_period_days": signals.get("notice_period_days", 90),
                        "saved_by_recruiters_30d": signals.get("saved_by_recruiters_30d", 0),
                        "last_active_date": signals.get("last_active_date", "2020-01-01"),
                        "skill_assessment_scores": signals.get("skill_assessment_scores", {}),
                    }
                    result = score_candidate_full(candidate, jd_req)
                    candidates_scored.append({**candidate, **result})
                    count += 1
                except Exception as e:
                    continue

        print(f"✅ Scored {len(candidates_scored)} hackathon candidates")

    # ── Upload / Fallback ──────────────────────────────────────
    elif req.dataset_source == "upload":
        profiles = db.query(JobSeekerProfile).all()
        if profiles:
            candidates_scored = score_from_db(profiles, jd_req)
        else:
            return {
                "message": "No candidates. Use INDIA RUNS Dataset for hackathon data!",
                "results": [], "total_ranked": 0, "jd_requirements": jd_req
            }
    else:
        raise HTTPException(status_code=400, detail="Invalid dataset source")

    if not candidates_scored:
        return {"message": "No candidates found", "results": [], "total_ranked": 0, "jd_requirements": jd_req}

    # Sort by score desc, then candidate_id asc (tie-break)
    candidates_scored.sort(key=lambda x: (-x["score"], x["candidate_id"]))
    top = candidates_scored[:req.top_n]
    for i, c in enumerate(top, 1):
        c["rank"] = i

    # Save result
    try:
        ranking = RankingResult(
            recruiter_id=user_id,
            jd_text=req.jd_text,
            dataset_source=req.dataset_source,
            results=top
        )
        db.add(ranking)
        db.commit()
    except Exception as e:
        print(f"Save error: {e}")

    return {
        "message": f"Ranked {len(candidates_scored):,} candidates!",
        "total_ranked": len(candidates_scored),
        "results": top,
        "jd_requirements": jd_req
    }


@router.get("/history")
def get_ranking_history(db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    try:
        return db.query(RankingResult).filter(
            RankingResult.recruiter_id == user_id
        ).order_by(RankingResult.created_at.desc()).limit(10).all()
    except Exception:
        return []