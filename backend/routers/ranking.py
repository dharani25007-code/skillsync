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
    "tcs", "infosys", "wipro", "accenture", "cognizant", "capgemini",
    "hcl technologies", "hcl", "tech mahindra", "mphasis", "hexaware",
    "mindtree", "l&t infotech", "ltts", "tata consultancy services", "cognizant technology solutions"
]

PRODUCT_COMPANIES = [
    "google", "microsoft", "amazon", "meta", "apple", "netflix",
    "flipkart", "swiggy", "zomato", "razorpay", "freshworks", "zoho",
    "phonepe", "cred", "meesho", "uber", "airbnb", "openai", "anthropic",
    "huggingface", "databricks", "atlassian", "stripe", "notion", "figma",
    "postman", "dream11", "sharechat", "ola", "makemytrip", "policybazaar"
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
    Supports both flattened (from database) and nested (from JSONL hackathon dataset) candidate structures.
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

    # ── Nested properties resolver ─────────────────────────────────
    prof = candidate.get("profile") or {}
    signals = candidate.get("redrob_signals") or {}

    title = (candidate.get("current_title") or prof.get("current_title") or "").strip().lower()
    years = float(candidate.get("years_of_experience") or prof.get("years_of_experience") or 0.0)
    open_to_work = bool(candidate.get("open_to_work") or signals.get("open_to_work_flag") or False)
    response_rate = float(candidate.get("recruiter_response_rate") or signals.get("recruiter_response_rate") or 0.5)
    github_score = float(candidate.get("github_activity_score") or signals.get("github_activity_score") or -1.0)
    interview_rate = float(candidate.get("interview_completion_rate") or signals.get("interview_completion_rate") or 0.5)
    notice_period = int(candidate.get("notice_period_days") or signals.get("notice_period_days") or 90)
    saved_30d = int(candidate.get("saved_by_recruiters_30d") or signals.get("saved_by_recruiters_30d") or 0)
    location = (candidate.get("location") or prof.get("location") or "India").strip()
    country = (candidate.get("country") or prof.get("country") or "").strip().lower()
    willing_relocate = bool(candidate.get("willing_to_relocate") or signals.get("willing_to_relocate") or False)
    
    skills = candidate.get("skills", []) or []
    career = candidate.get("career_history") or candidate.get("experience") or []
    education = candidate.get("education", []) or []
    
    exam_scores = candidate.get("skill_assessment_scores") or signals.get("skill_assessment_scores") or {}

    # Check if this is the specific hackathon founding team AI engineer job description
    is_hackathon_jd = "founding" in jd_full or "senior ai engineer" in jd_full

    # ── 0. HONEYPOT FILTER (CRITICAL) ──────────────────────────────
    # Filter out candidates with 0 duration for any skill
    if any(isinstance(s, dict) and s.get("duration_months") == 0 for s in skills):
        return {
            "score": 0.0,
            "reasoning": "Honeypot Filter: invalid skill duration months (0 months)",
            "matching_skills": [],
            "signal_scores": {"career": 0.0, "skills": 0.0, "experience": 0.0, "behavioral": 0.0, "education": 0.0}
        }

    # ── 0. LOCATION GATEKEEPER ─────────────────────────────────────
    if country and country not in ["india", "in"] and not willing_relocate:
        return {
            "score": 0.0,
            "reasoning": "Location Filter: outside India and unwilling to relocate",
            "matching_skills": [],
            "signal_scores": {"career": 0.0, "skills": 0.0, "experience": 0.0, "behavioral": 0.0, "education": 0.0}
        }

    # ── 0. IRRELEVANT TITLE / KEYWORD STUFFER FILTER ───────────────
    # If is_hackathon_jd or is_tech_jd, reject completely non-matching titles
    has_bad_title = False
    if any(bad in title for bad in BAD_TITLE_KEYWORDS):
        has_bad_title = True

    if (is_hackathon_jd or is_tech_jd) and has_bad_title:
        return {
            "score": 0.0,
            "reasoning": f"Title Filter: irrelevant role '{title}'",
            "matching_skills": [],
            "signal_scores": {"career": 0.0, "skills": 0.0, "experience": 0.0, "behavioral": 0.0, "education": 0.0}
        }

    # ── 0. ZERO MATCHING SKILLS FILTER ─────────────────────────────
    matching_skills = []
    for s in skills:
        s_name = (s.get("name") if isinstance(s, dict) else str(s)).lower()
        if any(req in s_name or s_name in req for req in required_skills):
            matching_skills.append(s)

    if is_tech_jd and required_skills and not matching_skills:
        return {
            "score": 0.0,
            "reasoning": "Skills Filter: matches zero required technical skills",
            "matching_skills": [],
            "signal_scores": {"career": 0.0, "skills": 0.0, "experience": 0.0, "behavioral": 0.0, "education": 0.0}
        }

    # ── 0. SERVICE-FIRM-ONLY DISQUALIFIER ──────────────────────────
    total_jobs = len(career)
    consulting_jobs_count = 0
    product_jobs_count = 0
    
    for job in career:
        comp = job.get("company", "").lower() if isinstance(job, dict) else ""
        if any(cf in comp for cf in CONSULTING_FIRMS):
            consulting_jobs_count += 1
        if any(pc in comp for pc in PRODUCT_COMPANIES):
            product_jobs_count += 1

    if (is_hackathon_jd or is_tech_jd) and total_jobs > 0 and consulting_jobs_count == total_jobs:
        return {
            "score": 0.0,
            "reasoning": "Service-Firm Filter: consulting firm experience only",
            "matching_skills": [],
            "signal_scores": {"career": 0.0, "skills": 0.0, "experience": 0.0, "behavioral": 0.0, "education": 0.0}
        }

    # ── 0. LANGCHAIN-ONLY / RECENT-ONLY AI FILTER ──────────────────
    if is_hackathon_jd or is_tech_jd:
        ai_skills_count = 0
        langchain_only = True
        total_ai_duration = 0
        
        for s in skills:
            if isinstance(s, dict):
                s_name = s.get("name", "").lower()
                s_duration = s.get("duration_months", 0)
                
                is_ai = any(req in s_name for req in ["machine learning", "deep learning", "nlp", "llm", "transformers", "bert", "gpt", "fine-tuning", "rag", "pytorch", "tensorflow", "langchain", "openai"])
                if is_ai:
                    ai_skills_count += 1
                    total_ai_duration = max(total_ai_duration, s_duration)
                    if not any(lc in s_name for lc in ["langchain", "openai", "gpt"]):
                        langchain_only = False

        if ai_skills_count > 0 and langchain_only and total_ai_duration < 12:
            return {
                "score": 0.0,
                "reasoning": "AI Filter: AI experience is under 12 months and consists only of LangChain/OpenAI calls",
                "matching_skills": [],
                "signal_scores": {"career": 0.0, "skills": 0.0, "experience": 0.0, "behavioral": 0.0, "education": 0.0}
            }

    # ── 1. Career Relevance (30%) ─────────────────────────────
    if not is_tech_jd:
        # NON-TECH JD: title word-level overlap
        jd_words = [w for w in jd_title.split() if len(w) >= 2]
        if jd_words:
            match_count = sum(1 for w in jd_words if w in title)
            title_match_ratio = match_count / len(jd_words)
        else:
            candidate_title_words = [w for w in title.split() if len(w) >= 3]
            if candidate_title_words and jd_full:
                match_count = sum(1 for w in candidate_title_words if w in jd_full)
                title_match_ratio = match_count / len(candidate_title_words)
            else:
                title_match_ratio = 0.0

        if title_match_ratio >= 1.0:
            career_score = 1.0
        elif title_match_ratio >= 0.5:
            career_score = 0.85
        elif title_match_ratio > 0:
            career_score = 0.6
        else:
            career_score = 0.1
    else:
        # TECH JD:
        career_score = 0.5
        if has_bad_title:
            career_score -= 0.4

        good_title_words = ["engineer", "developer", "scientist", "researcher",
                            "architect", "lead", "principal", "ml", "ai", "data scientist", "data engineer", "data analyst"]
        if any(g in title for g in good_title_words):
            career_score += 0.2

        total_months = 0
        consulting_months = 0
        product_months = 0

        for job in career:
            if not isinstance(job, dict):
                continue
            company = (job.get("company") or "").lower()
            desc = (job.get("description") or "").lower()
            duration = job.get("duration_months", 0) or 0
            total_months += duration

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

        # Title chaser penalty
        if len(career) >= 3 and total_months > 0:
            avg_months = total_months / len(career)
            if avg_months < 18:
                career_score -= 0.15

    career_score = max(0.0, min(1.0, career_score))

    # ── 2. Skills Depth (25%) ─────────────────────────────────
    relevant_skill_score = 0
    total_relevant = len(matching_skills)

    for skill in matching_skills:
        if isinstance(skill, dict):
            name = skill.get("name", "")
            proficiency = skill.get("proficiency", "beginner")
            endorsements = skill.get("endorsements", 0)
            duration = skill.get("duration_months", 0)
        else:
            name = str(skill)
            proficiency = "beginner"
            endorsements = 0
            duration = 0

        prof_score = {"beginner": 0.2, "intermediate": 0.5, "advanced": 0.8, "expert": 1.0}.get(proficiency, 0.3)
        endorse_bonus = min(endorsements / 50, 0.3)
        duration_bonus = min(duration / 48, 0.2)
        exam_bonus = (exam_scores.get(name, 0) / 100 * 0.3) if exam_scores else 0.0

        relevant_skill_score += min(prof_score + endorse_bonus + duration_bonus + exam_bonus, 1.5)

    if total_relevant == 0:
        skills_score = 0.05 if is_tech_jd else 0.5
    else:
        skills_score = min((relevant_skill_score / (total_relevant * 1.5)) * 0.7 + min(total_relevant / 10, 0.3), 1.0)

    # ── 3. Experience Fit (15%) ──────────────────────────────
    if is_hackathon_jd:
        # Target: 5 to 9 years (midpoint = 7.0)
        if 5.0 <= years <= 9.0:
            exp_score = 1.0
        elif 4.0 <= years < 5.0:
            exp_score = 0.8
        elif 3.0 <= years < 4.0:
            exp_score = 0.5
        elif years < 3.0:
            exp_score = 0.1
        elif 9.0 < years <= 12.0:
            exp_score = 0.8
        else:
            exp_score = 0.5
    else:
        target_exp = (min_exp + max_exp) / 2
        if target_exp == 0:
            exp_score = 0.8
        else:
            diff = abs(years - target_exp)
            exp_score = max(0.1, 1.0 - (diff / max(target_exp, 5)) * 0.8)

    # ── 4. Behavioral Signals (20%) ──────────────────────────
    behavioral_score = 0.3
    if open_to_work:
        behavioral_score += 0.25
    behavioral_score += response_rate * 0.2

    last_active = candidate.get("last_active_date") or signals.get("last_active_date") or "2026-01-01"
    try:
        if isinstance(last_active, str):
            last_date = datetime.strptime(last_active[:10], "%Y-%m-%d").date()
        elif isinstance(last_active, (date, datetime)):
            last_date = last_active if isinstance(last_active, date) else last_active.date()
        else:
            last_date = None
            
        if last_date:
            days_inactive = (date(2026, 6, 7) - last_date).days
            if days_inactive <= 30:
                behavioral_score += 0.15
            elif days_inactive <= 90:
                behavioral_score += 0.08
            elif days_inactive > 365:
                behavioral_score -= 0.15
    except Exception:
        pass

    if github_score > 0:
        behavioral_score += (github_score / 100) * 0.1
    behavioral_score += interview_rate * 0.05
    
    if notice_period <= 30:
        behavioral_score += 0.05
    elif notice_period > 90:
        behavioral_score -= 0.1
        
    if saved_30d > 5:
        behavioral_score += 0.05

    behavioral_score = max(0.0, min(1.0, behavioral_score))

    # ── 5. Education (10%) ───────────────────────────────────
    edu_score = 0.3
    for edu in education:
        if not isinstance(edu, dict):
            continue
        tier = edu.get("tier", "unknown")
        field = edu.get("field_of_study", "").lower()
        degree = edu.get("degree", "").lower()

        tier_s = {"tier_1": 1.0, "tier_2": 0.8, "tier_3": 0.6, "tier_4": 0.4}.get(tier, 0.3)
        field_bonus = 0.2 if any(f in field for f in ["computer", "software", "data", "ai", "math", "statistics"]) else 0
        deg_bonus = 0.2 if any(d in degree for d in ["m.tech", "mtech", "m.s", "ms", "ph.d", "phd"]) else 0.1 if any(d in degree for d in ["b.tech", "btech", "b.e", "be"]) else 0

        edu_score = max(edu_score, min(tier_s + field_bonus + deg_bonus, 1.0))

    # ── Weighted Sum ──────────────────────────────────────────
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

    final_score = round(max(0.0, min(1.0, final)), 4)

    # ── Plain reasoning generation for hackathon, else bullet format ──
    if is_hackathon_jd:
        product_companies = []
        consulting_companies = []
        for job in career:
            if not isinstance(job, dict):
                continue
            comp = job.get("company", "")
            comp_lower = comp.lower()
            if any(pc in comp_lower for pc in PRODUCT_COMPANIES) and comp not in product_companies:
                product_companies.append(comp)
            elif any(cf in comp_lower for cf in CONSULTING_FIRMS) and comp not in consulting_companies:
                consulting_companies.append(comp)

        expert_adv_skills = [
            (s.get("name") if isinstance(s, dict) else str(s))
            for s in skills
            if (s.get("proficiency") if isinstance(s, dict) else "beginner") in ["expert", "advanced"]
        ]
        core_skills = [
            s for s in expert_adv_skills
            if s.lower() in [
                "embeddings", "retrieval", "vector database", "pinecone", "weaviate", "milvus", "faiss",
                "nlp", "machine learning", "deep learning", "llm", "transformers", "rag", "pytorch", "python"
            ]
        ]

        edu_str = ""
        for edu in education:
            if not isinstance(edu, dict):
                continue
            if edu.get("tier") == "tier_1":
                edu_str = f"a Tier-1 {edu.get('degree', 'degree')} graduate"
                break
            elif edu.get("tier") == "tier_2":
                edu_str = f"a Tier-2 {edu.get('degree', 'degree')} graduate"
                break

        company_phrase = ""
        if product_companies:
            company_phrase = f" at product firms like {', '.join(product_companies[:2])}"
        elif consulting_companies:
            company_phrase = f" with strong technical tenure at {consulting_companies[0]}"

        skills_phrase = ""
        if core_skills:
            skills_phrase = f" specializing in {', '.join(core_skills[:3])}"

        sentence1 = f"{title.title()} with {years:.1f} years of experience{company_phrase},{skills_phrase}."

        behavioral_notes = []
        if open_to_work:
            behavioral_notes.append("actively seeking new opportunities")
        if response_rate > 0.7:
            behavioral_notes.append(f"highly responsive ({int(response_rate*100)}% response rate)")
        if github_score > 60:
            behavioral_notes.append("strong developer activity on GitHub")
        if edu_str:
            behavioral_notes.append(edu_str)

        if len(behavioral_notes) == 1:
            behavioral_str = behavioral_notes[0]
        elif len(behavioral_notes) == 2:
            behavioral_str = f"{behavioral_notes[0]} and {behavioral_notes[1]}"
        elif len(behavioral_notes) > 2:
            behavioral_str = f"{', '.join(behavioral_notes[:-1])}, and {behavioral_notes[-1]}"
        else:
            behavioral_str = ""

        concern_str = ""
        if notice_period >= 90:
            concern_str = f"Note: has a long {notice_period}-day notice period."
        elif notice_period >= 60:
            concern_str = f"Notice period is {notice_period} days, which is slightly long but manageable."

        if behavioral_str and concern_str:
            sentence2 = f"They are {behavioral_str}. {concern_str}"
        elif behavioral_str:
            sentence2 = f"They are {behavioral_str} and based in {location}."
        elif concern_str:
            sentence2 = f"Currently based in {location}. {concern_str}"
        else:
            sentence2 = f"Currently located in {location}."

        reasoning = f"{sentence1} {sentence2}"
    else:
        # General bullet-based reasoning
        matching_skills_names = [
            (s.get("name") if isinstance(s, dict) else str(s))
            for s in skills
            if any(req in (s.get("name") if isinstance(s, dict) else str(s)).lower() for req in required_skills)
        ]
        reasons = []
        if career_score >= 0.7:
            reasons.append("strong career fit (title & history align well)")
        elif career_score >= 0.5:
            reasons.append("partial career fit (some relevant background)")
        elif has_bad_title:
            reasons.append("⚠️ title mismatch — role does not align with JD")
        else:
            reasons.append("limited career relevance")

        if matching_skills_names:
            top_skills = ", ".join(matching_skills_names[:3])
            if skills_score >= 0.7:
                reasons.append(f"{len(matching_skills_names)} required skills matched at high proficiency ({top_skills})")
            elif skills_score >= 0.4:
                reasons.append(f"{len(matching_skills_names)} relevant skills found ({top_skills})")
            else:
                reasons.append("low skill depth on required areas")
        else:
            reasons.append("no matching skills detected for this JD")

        if exp_score >= 0.8:
            reasons.append(f"{years:.1f} yrs experience closely matches JD target")
        elif exp_score >= 0.5:
            reasons.append(f"{years:.1f} yrs experience (moderate fit to JD requirements)")
        else:
            reasons.append(f"{years:.1f} yrs experience (over/under-qualified for JD target)")

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

        for edu in education:
            if isinstance(edu, dict):
                t_str = edu.get("tier", "")
                if t_str == "tier_1":
                    reasons.append("Tier-1 institution")
                    break
                elif t_str == "tier_2":
                    reasons.append("Tier-2 institution")
                    break

        reasoning = " · ".join(reasons)

    return {
        "score": final_score,
        "reasoning": reasoning,
        "matching_skills": [s.get("name") if isinstance(s, dict) else str(s) for s in matching_skills],
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
            os.path.join(base_dir, "data", "candidates_100k.jsonl"),
            "data/candidates_100k.jsonl",
            os.path.join(base_dir, "data", "sample_submission.csv"),
            "data/sample_submission.csv",
            os.path.join(base_dir, "data", "candidates.jsonl"),
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
        valid_count = 0
        top_candidates = []

        # ── JSONL format (rich candidate objects) ──────────────
        if hackathon_file.endswith(".jsonl"):
            with open(hackathon_file, encoding="utf-8") as f:
                for line in f:
                    if count >= 100000:  # Process up to 100K
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
                        score = result.get("score", 0.0)
                        if score > 0.0:
                            valid_count += 1
                            top_candidates.append({**candidate, **result})
                            # Keep only the top N candidates in memory
                            top_candidates.sort(key=lambda x: (-x["score"], x["candidate_id"]))
                            top_candidates = top_candidates[:req.top_n]
                        count += 1
                    except Exception as e:
                        continue

        # ── CSV fallback (sample_submission.csv — parse reasoning field) ──
        else:
            with open(hackathon_file, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if count >= 100000:
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
                        score = result.get("score", 0.0)
                        if score > 0.0:
                            valid_count += 1
                            top_candidates.append({**candidate, **result})
                            # Keep only the top N candidates in memory
                            top_candidates.sort(key=lambda x: (-x["score"], x["candidate_id"]))
                            top_candidates = top_candidates[:req.top_n]
                        count += 1
                    except Exception:
                        continue

        print(f"✅ Scored {count:,} hackathon candidates, {valid_count:,} matched")
        candidates_scored = top_candidates
        total_ranked_count = valid_count

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
    if req.dataset_source != "hackathon":
        candidates_scored = [c for c in candidates_scored if c["score"] > 0.0]
        total_ranked_count = len(candidates_scored)

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
        "message": f"Ranked {total_ranked_count:,} candidates!",
        "total_ranked": total_ranked_count,
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