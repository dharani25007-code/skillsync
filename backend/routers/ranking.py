from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import RankingResult, JobSeekerProfile, User
from pydantic import BaseModel
from typing import Optional
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
import os, json, re, httpx, csv
from datetime import date, datetime
from io import StringIO

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

# Short tech keywords — matched as whole words to detect tech JDs like "ML Engineer" or "AI Engineer"
TECH_TITLE_KEYWORDS = [
    " ml ", " ai ", "ml engineer", "ai engineer", "data engineer", "data scientist",
    "software engineer", "software developer", "backend engineer", "frontend engineer",
    "full stack", "fullstack", "devops", "mlops", "cloud engineer", "platform engineer",
    "nlp engineer", "computer vision", "research engineer", "applied scientist",
    "machine learning engineer", "deep learning", "llm", "large language",
    "generative ai", "rag", "retrieval augmented", "site reliability",
    "data analyst", "analytics engineer", "bi engineer", "big data"
]

BAD_TITLE_KEYWORDS = [
    "marketing manager", "sales executive", "hr manager",
    "human resources", "accountant", "graphic designer",
    "content writer", "operations manager", "finance manager",
    "civil engineer", "mechanical engineer", "electrical engineer",
    "customer support", "business development", "business analyst",
    "project manager", "product manager", "scrum master", "recruiter",
    "talent acquisition", "operations", "sales", "marketing"
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
    jd_lower = jd_text.strip().lower()

    # Detect if user pasted a hackathon reasoning string as JD
    # e.g. "Marketing Manager with 13.2 yrs; 9 AI core skills; response rate 0.24."
    # In that case, extract just the job title from it
    reasoning_match = re.match(r'^(.+?)\s+with\s+[\d.]+\s+yrs', jd_lower)
    if reasoning_match and ";" in jd_lower:
        # It's a reasoning string — use just the title part as the JD
        jd_lower = reasoning_match.group(1).strip()

    required_skills = [s for s in TECH_SKILLS if s in jd_lower]
    # Fix: handle decimal years like '10.4 yrs' by using \d+(?:\.\d+)?
    exp_matches = re.findall(r'(\d+(?:\.\d+)?)\+?\s*(?:to\s*\d+(?:\.\d+)?\s*)?(?:years?|yrs?)', jd_lower)
    exp_nums = [float(x) for x in exp_matches if float(x) <= 30]
    min_exp = min(exp_nums) if exp_nums else 0
    max_exp = max(exp_nums) if exp_nums else 20

    # Extract intended job title from JD (first few words before 'with', 'and', or a digit)
    jd_title = ""
    title_match = re.match(r'^([a-z\s]+?)(?:\s+with\s|\s+and\s|\s+\d|,|$)', jd_lower.strip())
    if title_match:
        jd_title = title_match.group(1).strip()

    return {
        "required_skills": required_skills,
        "min_exp": min_exp,
        "max_exp": max_exp,
        "jd_title": jd_title,
        "jd_full": jd_lower      # Full JD text for tech-keyword detection & fallback matching
    }


def score_candidate_full(candidate: dict, jd_req: dict) -> dict:
    """
    5-signal scoring system.
    For TECH JDs (has required_skills): penalize irrelevant roles, reward tech.
    For NON-TECH JDs (no required_skills): title match is primary signal.
    """
    required_skills = jd_req["required_skills"]
    min_exp = jd_req["min_exp"]
    max_exp = jd_req["max_exp"]
    jd_title = jd_req.get("jd_title", "").lower().strip()
    jd_full = jd_req.get("jd_full", "").lower()

    # Detect tech JD: either has extracted skills OR contains tech title keywords
    is_tech_jd = (
        len(required_skills) > 0 or
        any(kw in f" {jd_full} " or kw in f" {jd_title} " for kw in TECH_TITLE_KEYWORDS)
    )

    # ── Signal 1: Career Relevance (30%) ─────────────────────
    has_bad_title = False  # Always defined
    title = (candidate.get("current_title") or "").lower()
    career = candidate.get("career_history", []) or []

    if not is_tech_jd:
        # NON-TECH JD: word-level overlap between extracted JD title and candidate title
        jd_words = [w for w in jd_title.split() if len(w) >= 2]
        if jd_words:
            match_count = sum(1 for w in jd_words if w in title)
            title_match_ratio = match_count / len(jd_words)
        else:
            # No JD title extracted and no tech keywords — compare JD text to candidate title
            # Check how many of the candidate's title words appear in the full JD text
            candidate_title_words = [w for w in title.split() if len(w) >= 3]
            if candidate_title_words and jd_full:
                match_count = sum(1 for w in candidate_title_words if w in jd_full)
                title_match_ratio = match_count / len(candidate_title_words)
            else:
                title_match_ratio = 0.0  # Cannot determine relevance — neutral/low

        if title_match_ratio >= 1.0:
            career_score = 1.0      # Exact match
        elif title_match_ratio >= 0.5:
            career_score = 0.85     # Partial match
        elif title_match_ratio > 0:
            career_score = 0.6      # Weak match
        else:
            career_score = 0.1      # No match — irrelevant candidate
    else:
        # TECH JD: Use previous logic with bad-title penalties and good-title bonuses
        career_score = 0.5
        if any(bad in title for bad in BAD_TITLE_KEYWORDS):
            has_bad_title = True
            career_score -= 0.4  # Heavy penalty for completely irrelevant titles

        good_title_words = ["engineer", "developer", "scientist", "researcher",
                            "architect", "lead", "principal", "ml", "ai", "data scientist", "data engineer", "data analyst"]
        if any(g in title for g in good_title_words):
            career_score += 0.2

        # Career history analysis (only relevant for tech JDs)
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

            relevant_kw = ["ranking", "retrieval", "recommendation", "search",
                           "embeddings", "nlp", "machine learning", "ai system",
                           "ml pipeline", "llm", "rag", "vector"]
            if any(kw in desc for kw in relevant_kw):
                career_score += 0.05

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

        skill_name_orig = skill.get("name", "") if isinstance(skill, dict) else str(skill)
        exam_bonus = (exam_scores.get(skill_name_orig, 0) / 100 * 0.3)

        relevant_skill_score += min(prof_score + endorse_bonus + duration_bonus + exam_bonus, 1.5)

    if total_relevant == 0:
        skills_score = 0.05 if is_tech_jd else 0.5  # For non-tech, skills signal is neutral
    else:
        skills_score = min((relevant_skill_score / (total_relevant * 1.5)) * 0.7 + min(total_relevant / 10, 0.3), 1.0)

    # ── Signal 3: Experience Years (15%) ─────────────────────
    years = float(candidate.get("years_of_experience", 0) or 0)
    # Score based on how close candidate's experience is to what JD asked for
    target_exp = (min_exp + max_exp) / 2
    if target_exp == 0:
        exp_score = 0.8
    else:
        diff = abs(years - target_exp)
        exp_score = max(0.1, 1.0 - (diff / max(target_exp, 5)) * 0.8)


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
    
    if is_tech_jd:
        if has_bad_title:
            final = 0.0
        elif len(required_skills) > 0 and total_relevant == 0:
            final = 0.0
    else:
        if has_bad_title:
            final = final * 0.15

    # Build rich narrative reasoning
    matching_skills = [
        (s.get("name") if isinstance(s, dict) else str(s))
        for s in skills
        if any(req in (s.get("name") if isinstance(s, dict) else str(s)).lower() for req in required_skills)
    ]

    # Build reasoning fragments
    reasons = []

    # Career signal
    if career_score >= 0.7:
        reasons.append(f"strong career fit (title & history align well)")
    elif career_score >= 0.5:
        reasons.append(f"partial career fit (some relevant background)")
    elif has_bad_title:
        reasons.append(f"⚠️ title mismatch — role does not align with JD")
    else:
        reasons.append(f"limited career relevance")

    # Skills signal
    if matching_skills:
        top_skills = ", ".join(matching_skills[:3])
        if skills_score >= 0.7:
            reasons.append(f"{len(matching_skills)} required skills matched at high proficiency ({top_skills})")
        elif skills_score >= 0.4:
            reasons.append(f"{len(matching_skills)} relevant skills found ({top_skills})")
        else:
            reasons.append(f"low skill depth on required areas")
    else:
        reasons.append("no matching skills detected for this JD")

    # Experience signal
    if exp_score >= 0.8:
        reasons.append(f"{years:.1f} yrs experience closely matches JD target")
    elif exp_score >= 0.5:
        reasons.append(f"{years:.1f} yrs experience (moderate fit to JD requirements)")
    else:
        reasons.append(f"{years:.1f} yrs experience (over/under-qualified for JD target)")

    # Behavioral signal
    behavioral_notes = []
    if open_to_work:
        behavioral_notes.append("actively open to work")
    if response_rate >= 0.7:
        behavioral_notes.append(f"{int(response_rate*100)}% recruiter response rate")
    if exam_scores:
        behavioral_notes.append("exam-verified skills")
    if github_score > 50:
        behavioral_notes.append("active GitHub contributor")
    if behavioral_notes:
        reasons.append(", ".join(behavioral_notes))

    # Education signal
    for edu in education:
        tier = edu.get("tier", "") if isinstance(edu, dict) else ""
        if tier == "tier_1":
            reasons.append("Tier-1 institution")
            break
        elif tier == "tier_2":
            reasons.append("Tier-2 institution")
            break

    reasoning = " · ".join(reasons)

    return {
        "score": round(max(0.0, min(1.0, final)), 4),
        "reasoning": reasoning,
        "matching_skills": matching_skills,
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


def get_mock_skills(title: str, num_skills: int):
    t = title.lower()
    if "civil" in t:
        pool = ["AutoCAD", "Structural Analysis", "Surveying", "Concrete", "Project Management", "Construction", "Revit", "Geotechnical"]
    elif "hr" in t or "human" in t:
        pool = ["Recruiting", "Employee Relations", "Payroll", "Onboarding", "Talent Management", "HRIS", "Performance Management"]
    elif "marketing" in t:
        pool = ["SEO", "Content Marketing", "Google Analytics", "Social Media", "Campaign Management", "Copywriting", "PPC"]
    elif "accountant" in t or "finance" in t:
        pool = ["Accounting", "Tax Preparation", "Financial Analysis", "Excel", "QuickBooks", "Auditing", "Budgeting"]
    elif "sales" in t:
        pool = ["B2B Sales", "Lead Generation", "CRM", "Negotiation", "Cold Calling", "Account Management", "Salesforce"]
    elif "graphic" in t:
        pool = ["Photoshop", "Illustrator", "InDesign", "Figma", "UI/UX", "Typography", "Branding"]
    elif "content" in t:
        pool = ["Copywriting", "Blogging", "SEO", "Editing", "Proofreading", "Content Strategy", "WordPress"]
    elif "business analyst" in t:
        pool = ["Requirements Gathering", "SQL", "Tableau", "Process Modeling", "Agile", "UML", "Data Analysis"]
    elif "project manager" in t:
        pool = ["Agile", "Scrum", "Jira", "Risk Management", "Stakeholder Communication", "Budgeting", "Resource Planning"]
    elif "mechanical" in t:
        pool = ["SolidWorks", "CAD", "Thermodynamics", "Fluid Mechanics", "Manufacturing", "Finite Element Analysis", "HVAC"]
    elif "customer support" in t:
        pool = ["Zendesk", "Communication", "Troubleshooting", "CRM", "Conflict Resolution", "Ticketing System"]
    elif "operations" in t:
        pool = ["Supply Chain", "Logistics", "Process Improvement", "Vendor Management", "Inventory", "Six Sigma"]
    else:
        pool = ["Machine Learning", "Python", "Deep Learning", "NLP", "FastAPI", "SQL", "Docker", "AWS", "TensorFlow", "PyTorch"]
    
    # If num_skills is 0, give them at least some generic skills so their profile isn't empty
    count = num_skills if num_skills > 0 else 5
    return pool[:count]


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
        profiles = db.query(JobSeekerProfile).join(
            User, JobSeekerProfile.user_id == User.id
        ).filter(
            ~User.email.like("%example.com%"),
            ~User.email.like("%test_%")
        ).all()
        if not profiles:
            return {
                "message": "No SkillSync candidates yet. Ask job seekers to register!",
                "results": [], "total_ranked": 0, "jd_requirements": jd_req
            }
        candidates_scored = score_from_db(profiles, jd_req)

    # ── INDIA RUNS Hackathon Dataset ───────────────────────────
    elif req.dataset_source == "hackathon":
        # Prioritize the real hackathon dataset (sample_submission.csv)
        base_dir = os.path.dirname(os.path.dirname(__file__))
        possible_paths = [
            os.path.join(base_dir, "data", "sample_submission.csv"),
            "data/sample_submission.csv",
            os.path.join(base_dir, "data", "candidates_100k.jsonl"),
            os.path.join(base_dir, "data", "candidates.jsonl"),
            "data/candidates_100k.jsonl",
            "data/candidates.jsonl",
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
                detail=f"No hackathon dataset found. Run: python generate_candidates.py in the backend/ directory. Checked: {[os.path.normpath(p) for p in possible_paths]}"
            )

        print(f"✅ Loading hackathon dataset from: {hackathon_file}")
        count = 0

        # ── JSONL format (rich candidate objects) ──────────────
        if hackathon_file.endswith(".jsonl"):
            with open(hackathon_file, encoding="utf-8") as f:
                for line in f:
                    if count >= 50000:  # Process up to 50K for speed
                        break
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        candidate = json.loads(line)
                        # Normalize field names that may differ between datasets
                        candidate.setdefault("candidate_id", f"CAND_{count:07d}")
                        candidate.setdefault("name", candidate["candidate_id"])
                        candidate.setdefault("open_to_work", True)
                        candidate.setdefault("recruiter_response_rate", 0.5)
                        candidate.setdefault("github_activity_score", -1)
                        candidate.setdefault("interview_completion_rate", 0.5)
                        candidate.setdefault("notice_period_days", 30)
                        candidate.setdefault("saved_by_recruiters_30d", 0)
                        candidate.setdefault("last_active_date", "2026-01-01")
                        candidate.setdefault("skill_assessment_scores", {})
                        candidate.setdefault("education", [])
                        candidate.setdefault("career_history", [])
                        candidate.setdefault("skills", [])

                        result = score_candidate_full(candidate, jd_req)
                        candidates_scored.append({**candidate, **result})
                        count += 1
                    except Exception as e:
                        continue

        # ── CSV fallback (sample_submission.csv — parse reasoning field) ──
        else:
            with open(hackathon_file, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if count >= 10000:
                        break
                    reasoning = row.get("reasoning", "")
                    if not reasoning:
                        continue
                    try:
                        parts = reasoning.split(";")
                        title_exp = parts[0] if parts else ""
                        skills_part = parts[1] if len(parts) > 1 else ""
                        rr_part = parts[2] if len(parts) > 2 else ""

                        title = title_exp.split(" with ")[0].strip() if " with " in title_exp else title_exp.strip()
                        exp_str = title_exp.split(" with ")[1].replace(" yrs", "").strip() if " with " in title_exp else "0"
                        num_skills_str = skills_part.replace(" AI core skills", "").strip()
                        rr_str = rr_part.replace(" response rate", "").replace("rate", "").strip().rstrip(".")

                        candidate = {
                            "candidate_id": row.get("candidate_id", f"CAND_{count}"),
                            "name": row.get("candidate_id", f"CAND_{count}"),
                            "current_title": title,
                            "years_of_experience": float(exp_str) if exp_str.replace(".", "", 1).isdigit() else 0.0,
                            "skills": get_mock_skills(title, int(num_skills_str) if num_skills_str.isdigit() else 3),
                            "open_to_work": True,
                            "recruiter_response_rate": float(rr_str) if rr_str.replace(".", "", 1).isdigit() else 0.5,
                            "education": [],
                            "career_history": [],
                            "skill_assessment_scores": {},
                        }
                        result = score_candidate_full(candidate, jd_req)
                        candidates_scored.append({**candidate, **result})
                        count += 1
                    except Exception:
                        continue

        print(f"✅ Scored {len(candidates_scored):,} hackathon candidates")

    # ── Upload / Fallback ──────────────────────────────────────
    elif req.dataset_source == "upload":
        profiles = db.query(JobSeekerProfile).join(
            User, JobSeekerProfile.user_id == User.id
        ).filter(
            ~User.email.like("%example.com%"),
            ~User.email.like("%test_%")
        ).all()
        if profiles:
            candidates_scored = score_from_db(profiles, jd_req)
        else:
            return {
                "message": "No candidates. Use INDIA RUNS Dataset for hackathon data!",
                "results": [], "total_ranked": 0, "jd_requirements": jd_req
            }
    else:
        raise HTTPException(status_code=400, detail="Invalid dataset source")

    # Filter out candidates with 0.0 score (completely unrelated)
    candidates_scored = [c for c in candidates_scored if c["score"] > 0.0]

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


@router.post("/rank_upload")
async def rank_candidates_csv(
    file: UploadFile = File(...),
    jd_text: str = Form(...),
    top_n: int = Form(20),
    user_id: int = Depends(get_current_user)
):
    # Check if this is a macOS metadata companion file
    if file.filename.startswith("._"):
        raise HTTPException(
            status_code=400,
            detail="You uploaded a macOS metadata companion file (starting with '._'). Please select and upload the actual CSV dataset file."
        )

    content = await file.read()
    if content.startswith(b"\x00\x05\x16\x07"):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file appears to be a macOS AppleDouble metadata file. Please select and upload the actual CSV dataset file."
        )

    jd_req = extract_jd_requirements(jd_text)
    candidates_scored = []
    print(f"\n=== rank_upload DEBUG ===")
    print(f"JD text (first 80 chars): {jd_text[:80]!r}")
    print(f"JD requirements: {jd_req}")
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            text = content.decode(encoding)
            break
        except (UnicodeDecodeError, ValueError):
            continue
    else:
        raise HTTPException(status_code=400, detail="Could not decode the CSV file. Please save it as UTF-8 and try again.")
    
    # Handle Mac/Windows line endings safely
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    lines = [line for line in text.split('\n') if line.strip()]

    if not lines:
        return {"message": "CSV is completely empty.", "results": [], "total_ranked": 0, "jd_requirements": jd_req}

    # Parse CSV properly - read all rows as lists first
    all_rows = list(csv.reader(lines))
    if not all_rows:
        return {"message": "CSV is empty.", "results": [], "total_ranked": 0, "jd_requirements": jd_req}

    first_row_lower = [c.lower().strip() for c in all_rows[0]]
    KNOWN_HEADERS = {"name", "title", "experience", "skills", "reasoning",
                     "candidate_id", "rank", "score", "role", "exp",
                     "current_title", "years_of_experience", "response_rate",
                     "open_to_work", "candidate", "candidate_name", "job_title"}
    has_headers = any(cell in KNOWN_HEADERS for cell in first_row_lower)

    print(f"Total CSV lines: {len(lines)}")
    print(f"First row (raw): {all_rows[0]}")
    print(f"First row (lower): {first_row_lower}")
    print(f"has_headers: {has_headers}")

    rows_to_process = []
    if has_headers:
        # Use normalized lowercase headers
        headers = first_row_lower
        for raw_row in all_rows[1:]:
            if not any(c.strip() for c in raw_row):
                continue
            # Pad or trim row to match header length
            row_dict = {}
            for i, h in enumerate(headers):
                row_dict[h] = raw_row[i].strip() if i < len(raw_row) else ""
            rows_to_process.append(row_dict)
    else:
        # No headers — detect format per row
        for raw_row in all_rows:
            if not raw_row or not any(c.strip() for c in raw_row):
                continue
            if len(raw_row) == 1:
                cell = raw_row[0].strip()
                rows_to_process.append({"reasoning": cell})
            elif len(raw_row) >= 4:
                # Could be: candidate_id, rank, score, reasoning
                last_cell = raw_row[-1].strip()
                if " with " in last_cell and ";" in last_cell:
                    rows_to_process.append({
                        "candidate_id": raw_row[0].strip(),
                        "reasoning": last_cell
                    })
                else:
                    rows_to_process.append({
                        "name": raw_row[0].strip(),
                        "title": raw_row[1].strip(),
                        "experience": raw_row[2].strip(),
                        "skills": raw_row[3].strip() if len(raw_row) > 3 else ""
                    })
            elif len(raw_row) >= 2:
                rows_to_process.append({
                    "name": raw_row[0].strip(),
                    "title": raw_row[1].strip(),
                    "experience": raw_row[2].strip() if len(raw_row) > 2 else "0"
                })

    print(f"rows_to_process count: {len(rows_to_process)}")
    if rows_to_process:
        print(f"First processed row: {rows_to_process[0]}")

    for count, row in enumerate(rows_to_process):
        candidate = {}
        # Check if row has a 'reasoning' column with content in hackathon format
        reasoning_val = (row.get("reasoning") or "").strip()
        has_reasoning = bool(reasoning_val) and " with " in reasoning_val and "; " in reasoning_val

        # Resolve candidate ID
        cand_id = row.get("candidate_id") or row.get("id") or row.get("candidate id") or row.get("cand_id") or f"CSV_{count}"

        if has_reasoning:
            try:
                parts = reasoning_val.split(";")
                title_exp = parts[0].strip() if len(parts) > 0 else ""
                skills_part = parts[1].strip() if len(parts) > 1 else ""
                rr_part = parts[2].strip() if len(parts) > 2 else ""

                title = title_exp.split(" with ")[0].strip() if " with " in title_exp else title_exp.strip()
                exp_str = title_exp.split(" with ")[1].replace(" yrs", "").strip() if " with " in title_exp else "0"
                num_skills_str = skills_part.replace(" AI core skills", "").strip()
                rr_str = rr_part.replace(" response rate", "").replace("response rate", "").replace("rate", "").strip().rstrip(".")

                candidate = {
                    "candidate_id": cand_id,
                    "name": row.get("name") or row.get("candidate") or row.get("candidate_name") or cand_id,
                    "current_title": title,
                    "years_of_experience": float(exp_str) if exp_str.replace('.', '', 1).isdigit() else 0.0,
                    "skills": get_mock_skills(title, int(num_skills_str) if num_skills_str.isdigit() else 3),
                    "open_to_work": True,
                    "recruiter_response_rate": float(rr_str) if rr_str.replace('.', '', 1).isdigit() else 0.5,
                    "location": row.get("location") or "India",
                    "education": [],
                    "career_history": [],
                    "skill_assessment_scores": {}
                }
            except Exception as e:
                print(f"Reasoning parse error row {count}: {e}")
                continue
        else:
            try:
                # Support various column names for the custom dataset
                title = row.get("current_title") or row.get("title") or row.get("role") or row.get("job_title") or ""
                name = row.get("name") or row.get("candidate") or row.get("candidate_name") or cand_id

                exp_raw = row.get("years_of_experience") or row.get("experience") or row.get("exp") or "0"
                exp_str = ''.join(c for c in str(exp_raw) if c.isdigit() or c == '.')
                try:
                    exp_float = float(exp_str) if exp_str else 0.0
                except ValueError:
                    exp_float = 0.0

                skills_raw = (row.get("skills") or row.get("core_skills") or "").strip()
                # If skills_raw is just a float/int (score from previous download), ignore it
                if skills_raw.replace(".", "", 1).isdigit():
                    skills_raw = ""
                
                skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()] if skills_raw else get_mock_skills(title, 3)

                open_to_work_raw = str(row.get("open_to_work") or row.get("open") or "true").lower()
                open_to_work = open_to_work_raw in ["true", "1", "yes", "y", "t"]

                rr_raw = str(row.get("recruiter_response_rate") or row.get("response_rate") or row.get("rr") or "0.5")
                rr_str_num = ''.join(c for c in rr_raw if c.isdigit() or c == '.')
                try:
                    rr_float = float(rr_str_num) if rr_str_num else 0.5
                except ValueError:
                    rr_float = 0.5

                candidate = {
                    "candidate_id": cand_id,
                    "name": name,
                    "current_title": title,
                    "years_of_experience": exp_float,
                    "skills": skills_list,
                    "open_to_work": open_to_work,
                    "recruiter_response_rate": rr_float,
                    "location": row.get("location") or "India",
                    "education": [],
                    "career_history": [],
                    "skill_assessment_scores": {}
                }
            except Exception as e:
                print(f"Error parsing row {count}: {e}")
                continue
        
        result = score_candidate_full(candidate, jd_req)
        candidates_scored.append({**candidate, **result})

    # Filter out candidates with 0.0 score (completely unrelated)
    candidates_scored = [c for c in candidates_scored if c["score"] > 0.0]

    if not candidates_scored:
        return {"message": "No candidates found in CSV. Please ensure your CSV has data rows and valid headers like 'Name', 'Title', 'Experience'.", "results": [], "total_ranked": 0, "jd_requirements": jd_req}

    candidates_scored.sort(key=lambda x: (-x["score"], x["candidate_id"]))
    top = candidates_scored[:top_n]
    for i, c in enumerate(top, 1):
        c["rank"] = i

    return {
        "message": f"Ranked {len(candidates_scored):,} candidates from CSV!",
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