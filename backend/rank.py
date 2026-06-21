import argparse
import json
import csv
import os
import sys
from datetime import datetime

# ── List of Consulting Firms (Body-shoppers) ──────────────────────
CONSULTING_FIRMS = {
    "tcs", "infosys", "wipro", "accenture", "cognizant", "capgemini",
    "hcl technologies", "hcl", "tech mahindra", "mphasis", "hexaware",
    "mindtree", "l&t infotech", "ltts", "tata consultancy services", "cognizant technology solutions"
}

# ── List of Product Companies ──────────────────────────────────────
PRODUCT_COMPANIES = {
    "google", "microsoft", "amazon", "meta", "apple", "netflix",
    "flipkart", "swiggy", "zomato", "razorpay", "freshworks", "zoho",
    "phonepe", "cred", "meesho", "uber", "airbnb", "openai", "anthropic",
    "huggingface", "databricks", "atlassian", "stripe", "notion", "figma",
    "postman", "dream11", "sharechat", "ola", "makemytrip", "policybazaar"
}

# ── JD Requirements for "Senior AI Engineer - Founding Team" ──────
REQUIRED_SKILLS = {
    "embeddings", "retrieval", "vector database", "pinecone", "weaviate",
    "qdrant", "milvus", "opensearch", "elasticsearch", "faiss", "nlp",
    "natural language processing", "ranking", "search", "recommendation",
    "machine learning", "deep learning", "llm", "transformers", "bert",
    "gpt", "fine-tuning", "lora", "qlora", "peft", "rag", "pytorch",
    "tensorflow", "python", "scikit-learn"
}

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    except:
        return None

def parse_csv_row_to_candidate(row):
    # Standardize keys to lowercase for robust matching
    norm_row = {k.strip().lower(): v for k, v in row.items() if k is not None}
    
    # We must have at least a candidate_id
    candidate_id = row.get("candidate_id") or row.get("Candidate ID") or norm_row.get("candidate_id") or norm_row.get("id")
    if not candidate_id:
        return None
        
    c = {
        "candidate_id": candidate_id,
        "skills": [],
        "career_history": [],
        "education": [],
        "profile": {},
        "redrob_signals": {}
    }
    
    # ── 1. Parse Skills ───────────────────────────────────────────
    skills_raw = row.get("skills") or norm_row.get("skills")
    if skills_raw:
        skills_raw = skills_raw.strip()
        if skills_raw.startswith("[") and skills_raw.endswith("]"):
            try:
                c["skills"] = json.loads(skills_raw)
            except Exception:
                pass
        if not c["skills"]:
            delimiter = ";" if ";" in skills_raw else ","
            c["skills"] = [s.strip() for s in skills_raw.split(delimiter) if s.strip()]
            
    # ── 2. Parse Career History ───────────────────────────────────
    career_raw = row.get("career_history") or norm_row.get("career_history") or norm_row.get("career")
    if career_raw:
        career_raw = career_raw.strip()
        if career_raw.startswith("[") and career_raw.endswith("]"):
            try:
                c["career_history"] = json.loads(career_raw)
            except Exception:
                pass
                
    # ── 3. Parse Education ────────────────────────────────────────
    edu_raw = row.get("education") or norm_row.get("education")
    if edu_raw:
        edu_raw = edu_raw.strip()
        if edu_raw.startswith("[") and edu_raw.endswith("]"):
            try:
                c["education"] = json.loads(edu_raw)
            except Exception:
                pass
                
    # ── 4. Parse Profile ──────────────────────────────────────────
    prof_raw = row.get("profile") or norm_row.get("profile")
    if prof_raw:
        prof_raw = prof_raw.strip()
        if prof_raw.startswith("{") and prof_raw.endswith("}"):
            try:
                c["profile"] = json.loads(prof_raw)
            except Exception:
                pass
    
    if not c["profile"]:
        title = row.get("current_title") or norm_row.get("current_title") or norm_row.get("title") or ""
        yoe = row.get("years_of_experience") or norm_row.get("years_of_experience") or norm_row.get("yoe") or 0
        loc = row.get("location") or norm_row.get("location") or ""
        country = row.get("country") or norm_row.get("country") or ""
        try:
            yoe = float(yoe)
        except ValueError:
            yoe = 0.0
            
        c["profile"] = {
            "current_title": title,
            "years_of_experience": yoe,
            "location": loc,
            "country": country
        }
        
    # ── 5. Parse Redrob Signals ───────────────────────────────────
    sig_raw = row.get("redrob_signals") or norm_row.get("redrob_signals") or norm_row.get("signals")
    if sig_raw:
        sig_raw = sig_raw.strip()
        if sig_raw.startswith("{") and sig_raw.endswith("}"):
            try:
                c["redrob_signals"] = json.loads(sig_raw)
            except Exception:
                pass
                
    open_to_work = row.get("open_to_work") or norm_row.get("open_to_work") or norm_row.get("open_to_work_flag")
    if open_to_work is not None:
        c["open_to_work"] = str(open_to_work).strip().lower() in ["true", "1", "yes"]
        c["redrob_signals"]["open_to_work_flag"] = c["open_to_work"]
        
    willing = row.get("willing_to_relocate") or norm_row.get("willing_to_relocate")
    if willing is not None:
        c["willing_to_relocate"] = str(willing).strip().lower() in ["true", "1", "yes"]
        c["redrob_signals"]["willing_to_relocate"] = c["willing_to_relocate"]
        
    notice = row.get("notice_period_days") or norm_row.get("notice_period_days") or norm_row.get("notice_period")
    if notice is not None:
        try:
            c["redrob_signals"]["notice_period_days"] = int(notice)
        except ValueError:
            pass
            
    rr = row.get("recruiter_response_rate") or norm_row.get("recruiter_response_rate") or norm_row.get("response_rate")
    if rr is not None:
        try:
            c["redrob_signals"]["recruiter_response_rate"] = float(rr)
        except ValueError:
            pass
            
    return c

def load_candidates(file_path):
    candidates = []
    is_csv = False
    
    # Try reading the first line to detect format
    with open(file_path, "r", encoding="utf-8") as f:
        first_line = ""
        for line in f:
            if line.strip():
                first_line = line.strip()
                break
                
    if not first_line:
        return [], False
        
    if not (first_line.startswith("{") and first_line.endswith("}")):
        is_csv = True
        
    if is_csv:
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                c = parse_csv_row_to_candidate(row)
                if c:
                    candidates.append(c)
    else:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    c = json.loads(line)
                    candidates.append(c)
                except Exception:
                    continue
                    
    return candidates, is_csv

def score_candidate(c):
    # Normalize skills list (handles both list of dicts and list of strings)
    raw_skills = c.get("skills", []) or []
    skills = []
    for s in raw_skills:
        if isinstance(s, dict):
            skills.append(s)
        elif isinstance(s, str):
            skills.append({
                "name": s,
                "proficiency": "advanced",
                "duration_months": 24,
                "endorsements": 10
            })

    # ── 0. HONEYPOT FILTER (CRITICAL) ──────────────────────────────
    # Filter out candidates with 0 duration for any skill
    if any(s.get("duration_months") == 0 for s in skills):
        return None

    # ── 0. LOCATION GATEKEEPER ─────────────────────────────────────
    # Relocation from Tier-1 India welcome. Outside India: case-by-case, but no work visa sponsorship.
    # If country is not India AND they are not willing to relocate, set score to 0.0
    country_raw = c.get("country") or c.get("profile", {}).get("country") or ""
    country = country_raw.strip().lower()
    willing_relocate = c.get("redrob_signals", {}).get("willing_to_relocate", False) or c.get("willing_to_relocate", False)
    if country and country not in ["india", "in"] and not willing_relocate:
        return None

    # ── 0. IRRELEVANT TITLE / KEYWORD STUFFER FILTER ───────────────
    # Reject plain-language keyword stuffers with completely non-matching current titles
    title_raw = c.get("current_title") or c.get("profile", {}).get("current_title") or ""
    current_title = title_raw.strip().lower()
    bad_title_keywords = [
        "marketing manager", "sales executive", "hr manager", "human resources",
        "accountant", "graphic designer", "content writer", "operations manager",
        "finance manager", "civil engineer", "mechanical engineer", "electrical engineer",
        "customer support", "business development", "business analyst", "project manager",
        "product manager", "scrum master", "recruiter", "talent acquisition"
    ]
    if any(bad in current_title for bad in bad_title_keywords):
        return None

    # ── 0. ZERO MATCHING SKILLS FILTER ─────────────────────────────
    # Reject tech candidates who match 0 required skills
    matching_skills = []
    for s in skills:
        s_name = s.get("name", "").lower()
        if any(req in s_name or s_name in req for req in REQUIRED_SKILLS):
            matching_skills.append(s)
            
    if not matching_skills:
        return None

    # ── 0. SERVICE-FIRM-ONLY DISQUALIFIER ──────────────────────────
    # Reject candidates who have only worked at consulting/service firms
    career = c.get("career_history", [])
    total_jobs = len(career)
    consulting_jobs_count = 0
    product_jobs_count = 0
    
    for job in career:
        comp = job.get("company", "").lower()
        if any(cf in comp for cf in CONSULTING_FIRMS):
            consulting_jobs_count += 1
        if any(pc in comp for pc in PRODUCT_COMPANIES):
            product_jobs_count += 1

    if total_jobs > 0 and consulting_jobs_count == total_jobs:
        return None

    # ── 0. LANGCHAIN-ONLY / RECENT-ONLY AI FILTER ──────────────────
    # Reject if AI experience is < 12 months and consists only of LangChain/OpenAI calls, with no pre-LLM ML
    ai_skills_count = 0
    langchain_only = True
    total_ai_duration = 0
    
    for s in skills:
        s_name = s.get("name", "").lower()
        s_duration = s.get("duration_months", 0)
        
        is_ai = any(req in s_name for req in ["machine learning", "deep learning", "nlp", "llm", "transformers", "bert", "gpt", "fine-tuning", "rag", "pytorch", "tensorflow", "langchain", "openai"])
        if is_ai:
            ai_skills_count += 1
            total_ai_duration = max(total_ai_duration, s_duration)
            if not any(lc in s_name for lc in ["langchain", "openai", "gpt"]):
                langchain_only = False

    if ai_skills_count > 0 and langchain_only and total_ai_duration < 12:
        return None

    # ── 1. Career Relevance (30%) ──────────────────────────────────
    # Starts at 0.5
    career_score = 0.5
    
    # Title match bonus
    good_titles = ["engineer", "developer", "scientist", "researcher", "architect", "lead", "principal", "ml", "ai"]
    if any(g in current_title for g in good_titles):
        career_score += 0.2
        
    # Product company experience bonus
    for job in career:
        comp = job.get("company", "").lower()
        desc = job.get("description", "").lower()
        duration = job.get("duration_months", 0)
        
        if any(pc in comp for pc in PRODUCT_COMPANIES):
            career_score += 0.08
            
        # Specific domain keyphrase match in career descriptions
        domain_kws = ["ranking", "retrieval", "search", "recommendation", "embeddings", "vector", "nlp", "rag", "evaluations", "ndcg", "map", "mrr"]
        if any(kw in desc for kw in domain_kws):
            career_score += 0.05

    # Consulting firm penalty
    total_months = sum(job.get("duration_months", 0) for job in career)
    consulting_months = 0
    product_months = 0
    
    for job in career:
        comp = job.get("company", "").lower()
        duration = job.get("duration_months", 0)
        if any(cf in comp for cf in CONSULTING_FIRMS):
            consulting_months += duration
        if any(pc in comp for pc in PRODUCT_COMPANIES):
            product_months += duration
            
    if total_months > 0:
        consulting_ratio = consulting_months / total_months
        if consulting_ratio > 0.8:
            career_score -= 0.25
        elif consulting_ratio > 0.5:
            career_score -= 0.1
            
    if product_months > 24:
        career_score += 0.1
        
    # Title chaser penalty: average job duration < 18 months and total jobs >= 3
    if len(career) >= 3 and total_months > 0:
        avg_months = total_months / len(career)
        if avg_months < 18:
            career_score -= 0.15

    career_score = max(0.0, min(1.0, career_score))

    # ── 2. Skills Depth (25%) ──────────────────────────────────────
    relevant_skill_score = 0
    total_relevant = len(matching_skills)
    exam_scores = c.get("skill_assessment_scores", {}) or c.get("redrob_signals", {}).get("skill_assessment_scores", {})

    for s in matching_skills:
        name = s.get("name", "")
        proficiency = s.get("proficiency", "beginner")
        endorsements = s.get("endorsements", 0)
        duration = s.get("duration_months", 0)
        
        prof_score = {"beginner": 0.2, "intermediate": 0.5, "advanced": 0.8, "expert": 1.0}.get(proficiency, 0.3)
        endorse_bonus = min(endorsements / 50, 0.3)
        duration_bonus = min(duration / 48, 0.2)
        exam_bonus = (exam_scores.get(name, 0) / 100 * 0.3) if exam_scores else 0.0
        
        relevant_skill_score += min(prof_score + endorse_bonus + duration_bonus + exam_bonus, 1.5)

    skills_score = min((relevant_skill_score / (total_relevant * 1.5)) * 0.7 + min(total_relevant / 10, 0.3), 1.0)

    # ── 3. Experience Fit (15%) ────────────────────────────────────
    # Target range: 5 to 9 years (midpoint = 7.0)
    yoe_val = c.get("years_of_experience") if c.get("years_of_experience") is not None else c.get("profile", {}).get("years_of_experience")
    yoe = float(yoe_val if yoe_val is not None else 0.0)
    if 5.0 <= yoe <= 9.0:
        exp_score = 1.0
    elif 4.0 <= yoe < 5.0:
        exp_score = 0.8
    elif 3.0 <= yoe < 4.0:
        exp_score = 0.5
    elif yoe < 3.0:
        exp_score = 0.1
    elif 9.0 < yoe <= 12.0:
        exp_score = 0.8
    else:
        exp_score = 0.5

    # ── 4. Behavioral Signals (20%) ────────────────────────────────
    signals = c.get("redrob_signals", {})
    open_to_work = bool(signals.get("open_to_work_flag", False)) or bool(c.get("open_to_work", False))
    response_rate = float(signals.get("recruiter_response_rate", 0.5) or 0.5)
    github_score = float(signals.get("github_activity_score", -1) or -1)
    interview_rate = float(signals.get("interview_completion_rate", 0.5) or 0.5)
    notice_period = int(signals.get("notice_period_days", 90) or 90)
    saved_30d = int(signals.get("saved_by_recruiters_30d", 0) or 0)

    behavioral_score = 0.3
    if open_to_work:
        behavioral_score += 0.25
    behavioral_score += response_rate * 0.2

    # Last active Date recency check
    last_active = signals.get("last_active_date", "2026-01-01")
    last_date = parse_date(last_active)
    if last_date:
        # Hackathon reference date is 2026-06-07
        days_inactive = (datetime(2026, 6, 7).date() - last_date).days
        if days_inactive <= 30:
            behavioral_score += 0.15
        elif days_inactive <= 90:
            behavioral_score += 0.08
        elif days_inactive > 365:
            behavioral_score -= 0.15

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

    # ── 5. Education (10%) ─────────────────────────────────────────
    education = c.get("education", [])
    edu_score = 0.3
    for edu in education:
        tier = edu.get("tier", "unknown")
        field = edu.get("field_of_study", "").lower()
        degree = edu.get("degree", "").lower()
        
        tier_s = {"tier_1": 1.0, "tier_2": 0.8, "tier_3": 0.6, "tier_4": 0.4}.get(tier, 0.3)
        field_bonus = 0.2 if any(f in field for f in ["computer", "software", "data", "ai", "math", "statistics"]) else 0
        deg_bonus = 0.2 if any(d in degree for d in ["m.tech", "mtech", "m.s", "ms", "ph.d", "phd"]) else 0.1 if any(d in degree for d in ["b.tech", "btech", "b.e", "be"]) else 0
        
        edu_score = max(edu_score, min(tier_s + field_bonus + deg_bonus, 1.0))

    # ── Weighted Sum ───────────────────────────────────────────────
    final_score = (
        career_score * 0.30 +
        skills_score * 0.25 +
        exp_score * 0.15 +
        behavioral_score * 0.20 +
        edu_score * 0.10
    )
    
    return round(max(0.0, min(1.0, final_score)), 4)

def generate_plain_reasoning(c, rank):
    prof = c.get("profile", {})
    title = c.get("current_title") or prof.get("current_title") or "Engineer"
    yoe_val = c.get("years_of_experience") if c.get("years_of_experience") is not None else prof.get("years_of_experience")
    yoe = float(yoe_val if yoe_val is not None else 0.0)
    location = c.get("location") or prof.get("location") or "India"
    
    career = c.get("career_history", [])
    product_companies = []
    consulting_companies = []
    
    for job in career:
        comp = job.get("company", "")
        comp_lower = comp.lower()
        if any(pc in comp_lower for pc in PRODUCT_COMPANIES) and comp not in product_companies:
            product_companies.append(comp)
        elif any(cf in comp_lower for cf in CONSULTING_FIRMS) and comp not in consulting_companies:
            consulting_companies.append(comp)
            
    raw_skills = c.get("skills", []) or []
    normalized_skills = []
    for s in raw_skills:
        if isinstance(s, dict):
            normalized_skills.append(s)
        elif isinstance(s, str):
            normalized_skills.append({
                "name": s,
                "proficiency": "advanced",
                "duration_months": 24,
                "endorsements": 10
            })
    skills = [s.get("name") for s in normalized_skills if s.get("proficiency") in ["expert", "advanced"]]
    core_skills = [s for s in skills if s.lower() in [
        "embeddings", "retrieval", "vector database", "pinecone", "weaviate", "milvus", "faiss",
        "nlp", "machine learning", "deep learning", "llm", "transformers", "rag", "pytorch", "python"
    ]]
    
    signals = c.get("redrob_signals", {})
    notice = int(signals.get("notice_period_days", 30) or 30)
    rr = float(signals.get("recruiter_response_rate", 0.5) or 0.5)
    github = float(signals.get("github_activity_score", -1) or -1)
    
    edu_str = ""
    for edu in c.get("education", []):
        if edu.get("tier") == "tier_1":
            edu_str = f"a Tier-1 {edu.get('degree', 'degree')} graduate"
            break
        elif edu.get("tier") == "tier_2":
            edu_str = f"a Tier-2 {edu.get('degree', 'degree')} graduate"
            break

    # Build sentences
    company_phrase = ""
    if product_companies:
        company_phrase = f" at product firms like {', '.join(product_companies[:2])}"
    elif consulting_companies:
        company_phrase = f" with strong technical tenure at {consulting_companies[0]}"
        
    skills_phrase = ""
    if core_skills:
        skills_phrase = f" specializing in {', '.join(core_skills[:3])}"
        
    sentence1 = f"{title} with {yoe:.1f} years of experience{company_phrase},{skills_phrase}."
    
    behavioral_notes = []
    if signals.get("open_to_work_flag") or c.get("open_to_work"):
        behavioral_notes.append("actively seeking new opportunities")
    if rr > 0.7:
        behavioral_notes.append(f"highly responsive ({int(rr*100)}% response rate)")
    if github > 60:
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
    if notice >= 90:
        concern_str = f"Note: has a long {notice}-day notice period."
    elif notice >= 60:
        concern_str = f"Notice period is {notice} days, which is slightly long but manageable."
        
    if behavioral_str and concern_str:
        sentence2 = f"They are {behavioral_str}. {concern_str}"
    elif behavioral_str:
        sentence2 = f"They are {behavioral_str} and based in {location}."
    elif concern_str:
        sentence2 = f"Currently based in {location}. {concern_str}"
    else:
        sentence2 = f"Currently located in {location}."
        
    return f"{sentence1} {sentence2}"

def main():
    parser = argparse.ArgumentParser(description="Redrob Challenge Candidate Ranker")
    parser.add_argument("--candidates", required=True, help="Path to candidates.jsonl file")
    parser.add_argument("--out", required=True, help="Path to output submission.csv file")
    args = parser.parse_args()
    
    print(f"Reading candidates from {args.candidates}...")
    candidates, is_csv = load_candidates(args.candidates)
    
    # Check if the parsed candidates have any profile information
    total_parsed_with_details = sum(1 for c in candidates if c.get("skills") or c.get("profile", {}).get("current_title"))
    if len(candidates) > 0 and total_parsed_with_details == 0:
        print("❌ Error: The uploaded file is a submission template, not a candidate profiles dataset.")
        sys.exit(1)
        
    candidates_scored = []
    for c in candidates:
        try:
            score = score_candidate(c)
            if score is not None and score > 0.0:
                candidates_scored.append({
                    "candidate_id": c["candidate_id"],
                    "score": score,
                    "raw_candidate": c
                })
        except Exception as e:
            continue
            
    print(f"Scored {len(candidates_scored)} valid candidates (filtered out honeypots and disqualifiers).")
    
    # Sort by score desc, then candidate_id asc (tie-breaker)
    candidates_scored.sort(key=lambda x: (-x["score"], x["candidate_id"]))
    
    top_100 = candidates_scored[:100]
    
    print("Generating reasonings for the top 100 candidates...")
    output_rows = []
    for rank_idx, item in enumerate(top_100, 1):
        cid = item["candidate_id"]
        score = item["score"]
        raw = item["raw_candidate"]
        reasoning = generate_plain_reasoning(raw, rank_idx)
        output_rows.append({
            "candidate_id": cid,
            "rank": rank_idx,
            "score": f"{score:.4f}",
            "reasoning": reasoning
        })
        
    # Write to CSV
    print(f"Writing results to {args.out}...")
    with open(args.out, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["candidate_id", "rank", "score", "reasoning"])
        writer.writeheader()
        for row in output_rows:
            writer.writerow(row)
            
    print("Done! Submission CSV generated successfully.")

if __name__ == "__main__":
    main()
