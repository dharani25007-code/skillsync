"""
generate_candidates.py
Generates a synthetic 100K candidate dataset for SkillSync / INDIA RUNS Hackathon.
Run from the backend/ directory:
    python generate_candidates.py
Outputs: data/candidates_100k.jsonl  (~50MB, ~100,000 candidates)
"""

import json
import random
import os
from datetime import date, timedelta

random.seed(42)

# ── Pools ────────────────────────────────────────────────────────

TECH_TITLES = [
    "ML Engineer", "Senior ML Engineer", "Data Scientist", "Senior Data Scientist",
    "AI Engineer", "Senior AI Engineer", "NLP Engineer", "Computer Vision Engineer",
    "Deep Learning Engineer", "Research Scientist", "Applied Scientist",
    "Full Stack Engineer", "Backend Engineer", "Frontend Engineer",
    "Software Engineer", "Senior Software Engineer", "Staff Engineer", "Principal Engineer",
    "Data Engineer", "Senior Data Engineer", "Platform Engineer",
    "DevOps Engineer", "MLOps Engineer", "Cloud Engineer", "Site Reliability Engineer",
    "Junior ML Engineer", "Junior Data Scientist", "Junior Software Engineer",
    "ML Researcher", "AI Researcher", "Quantitative Analyst",
]

NON_TECH_TITLES = [
    "Marketing Manager", "HR Manager", "Sales Executive", "Business Analyst",
    "Project Manager", "Operations Manager", "Accountant", "Finance Manager",
    "Graphic Designer", "Content Writer", "Customer Support",
    "Mechanical Engineer", "Civil Engineer", "Electrical Engineer",
]

PRODUCT_COMPANIES = [
    "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix",
    "Flipkart", "Swiggy", "Zomato", "Razorpay", "Freshworks",
    "Zoho", "PhonePe", "CRED", "Meesho", "Uber", "Airbnb",
    "OpenAI", "Anthropic", "HuggingFace", "Databricks",
    "Atlassian", "Stripe", "Notion", "Figma", "Postman",
    "Dream11", "ShareChat", "Ola", "MakeMyTrip", "PolicyBazaar",
]

CONSULTING_COMPANIES = [
    "TCS", "Infosys", "Wipro", "Accenture", "Cognizant",
    "Capgemini", "HCL Technologies", "Tech Mahindra", "Mphasis",
    "Hexaware", "Mindtree", "L&T Infotech",
]

ALL_COMPANIES = PRODUCT_COMPANIES + CONSULTING_COMPANIES + [
    "Startup", "Early Stage Startup", "Mid-stage Startup",
    "IBM", "Oracle", "SAP", "Salesforce", "ServiceNow",
]

LOCATIONS = [
    "Bangalore", "Hyderabad", "Chennai", "Pune", "Mumbai",
    "Delhi", "Gurgaon", "Noida", "Kolkata", "Ahmedabad",
    "Remote", "Bengaluru (Remote)", "Hyderabad (Hybrid)",
]

TECH_SKILLS_POOL = {
    "ml_ai": [
        {"name": "Machine Learning", "proficiency": "advanced", "endorsements": 45, "duration_months": 36},
        {"name": "Deep Learning", "proficiency": "advanced", "endorsements": 38, "duration_months": 30},
        {"name": "NLP", "proficiency": "advanced", "endorsements": 32, "duration_months": 24},
        {"name": "Computer Vision", "proficiency": "intermediate", "endorsements": 28, "duration_months": 20},
        {"name": "Reinforcement Learning", "proficiency": "intermediate", "endorsements": 15, "duration_months": 12},
        {"name": "LLM", "proficiency": "advanced", "endorsements": 40, "duration_months": 18},
        {"name": "Transformers", "proficiency": "advanced", "endorsements": 35, "duration_months": 20},
        {"name": "BERT", "proficiency": "expert", "endorsements": 42, "duration_months": 24},
        {"name": "GPT", "proficiency": "advanced", "endorsements": 38, "duration_months": 15},
        {"name": "Fine-tuning", "proficiency": "intermediate", "endorsements": 25, "duration_months": 12},
        {"name": "RAG", "proficiency": "advanced", "endorsements": 30, "duration_months": 10},
        {"name": "Embeddings", "proficiency": "advanced", "endorsements": 32, "duration_months": 18},
        {"name": "FAISS", "proficiency": "intermediate", "endorsements": 20, "duration_months": 10},
        {"name": "Vector Database", "proficiency": "intermediate", "endorsements": 22, "duration_months": 12},
        {"name": "MLOps", "proficiency": "intermediate", "endorsements": 28, "duration_months": 18},
    ],
    "languages": [
        {"name": "Python", "proficiency": "expert", "endorsements": 50, "duration_months": 48},
        {"name": "SQL", "proficiency": "advanced", "endorsements": 40, "duration_months": 36},
        {"name": "JavaScript", "proficiency": "advanced", "endorsements": 35, "duration_months": 30},
        {"name": "TypeScript", "proficiency": "intermediate", "endorsements": 28, "duration_months": 24},
        {"name": "Java", "proficiency": "intermediate", "endorsements": 30, "duration_months": 28},
        {"name": "C++", "proficiency": "intermediate", "endorsements": 22, "duration_months": 20},
        {"name": "R", "proficiency": "intermediate", "endorsements": 18, "duration_months": 18},
        {"name": "Scala", "proficiency": "beginner", "endorsements": 10, "duration_months": 8},
        {"name": "Go", "proficiency": "beginner", "endorsements": 12, "duration_months": 10},
        {"name": "Rust", "proficiency": "beginner", "endorsements": 8, "duration_months": 6},
    ],
    "frameworks": [
        {"name": "TensorFlow", "proficiency": "advanced", "endorsements": 38, "duration_months": 30},
        {"name": "PyTorch", "proficiency": "expert", "endorsements": 45, "duration_months": 36},
        {"name": "Keras", "proficiency": "advanced", "endorsements": 32, "duration_months": 24},
        {"name": "Scikit-learn", "proficiency": "expert", "endorsements": 40, "duration_months": 36},
        {"name": "Pandas", "proficiency": "expert", "endorsements": 42, "duration_months": 40},
        {"name": "NumPy", "proficiency": "expert", "endorsements": 40, "duration_months": 40},
        {"name": "FastAPI", "proficiency": "advanced", "endorsements": 30, "duration_months": 20},
        {"name": "Django", "proficiency": "intermediate", "endorsements": 28, "duration_months": 24},
        {"name": "Flask", "proficiency": "intermediate", "endorsements": 25, "duration_months": 20},
        {"name": "React", "proficiency": "advanced", "endorsements": 38, "duration_months": 30},
        {"name": "Node.js", "proficiency": "intermediate", "endorsements": 30, "duration_months": 24},
        {"name": "Spark", "proficiency": "intermediate", "endorsements": 25, "duration_months": 18},
    ],
    "cloud_infra": [
        {"name": "AWS", "proficiency": "advanced", "endorsements": 38, "duration_months": 30},
        {"name": "GCP", "proficiency": "intermediate", "endorsements": 28, "duration_months": 20},
        {"name": "Azure", "proficiency": "intermediate", "endorsements": 25, "duration_months": 18},
        {"name": "Docker", "proficiency": "advanced", "endorsements": 35, "duration_months": 30},
        {"name": "Kubernetes", "proficiency": "intermediate", "endorsements": 28, "duration_months": 20},
        {"name": "Elasticsearch", "proficiency": "intermediate", "endorsements": 22, "duration_months": 15},
        {"name": "PostgreSQL", "proficiency": "advanced", "endorsements": 35, "duration_months": 30},
        {"name": "MongoDB", "proficiency": "intermediate", "endorsements": 28, "duration_months": 22},
        {"name": "Redis", "proficiency": "intermediate", "endorsements": 22, "duration_months": 18},
    ],
}

ALL_TECH_SKILLS = (
    TECH_SKILLS_POOL["ml_ai"]
    + TECH_SKILLS_POOL["languages"]
    + TECH_SKILLS_POOL["frameworks"]
    + TECH_SKILLS_POOL["cloud_infra"]
)

INSTITUTION_TIERS = {
    "tier_1": ["IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kanpur", "IISc Bangalore", "BITS Pilani"],
    "tier_2": ["NIT Trichy", "NIT Warangal", "NIT Surathkal", "IIIT Hyderabad", "BITS Goa", "VIT Vellore"],
    "tier_3": ["SRM", "Amrita", "Manipal", "Symbiosis", "Christ University", "PES University"],
    "tier_4": ["State Universities", "Private Engineering Colleges"],
}

FIELDS = ["Computer Science", "Software Engineering", "Data Science", "Artificial Intelligence",
          "Mathematics", "Statistics", "Electronics Engineering", "Information Technology"]

DEGREES = ["B.Tech", "M.Tech", "M.S", "Ph.D", "B.E", "B.Sc", "M.Sc", "MBA"]

JOB_DESCRIPTIONS = [
    "Built and deployed machine learning pipelines for real-time recommendations",
    "Developed NLP models for text classification and sentiment analysis",
    "Worked on LLM fine-tuning and RAG architecture for enterprise chatbots",
    "Designed and maintained data engineering pipelines using Spark and Kafka",
    "Built microservices architecture with FastAPI and PostgreSQL",
    "Implemented computer vision models for object detection in production",
    "Created data science solutions for demand forecasting and pricing optimization",
    "Developed retrieval systems using vector databases and embeddings",
    "Built full-stack web applications with React and Node.js",
    "Worked on A/B testing framework and statistical analysis",
    "Developed REST APIs and GraphQL endpoints for mobile applications",
    "Implemented CI/CD pipelines and DevOps infrastructure on AWS",
    "Contributed to open-source ML libraries and published research papers",
    "Built scalable backend services handling 10M+ requests per day",
    "Developed ranking and recommendation systems for e-commerce platform",
]


def rand_date(start_days_ago: int, end_days_ago: int) -> str:
    days = random.randint(end_days_ago, start_days_ago)
    return (date(2026, 6, 7) - timedelta(days=days)).isoformat()


def gen_skills_for_title(title: str, count: int) -> list:
    t = title.lower()
    if any(x in t for x in ["ml", "machine learning", "deep learning", "ai ", "nlp", "research"]):
        pools = TECH_SKILLS_POOL["ml_ai"] + TECH_SKILLS_POOL["languages"][:4] + TECH_SKILLS_POOL["frameworks"][:6]
    elif any(x in t for x in ["data scientist", "data science"]):
        pools = TECH_SKILLS_POOL["ml_ai"][:6] + TECH_SKILLS_POOL["languages"][:3] + TECH_SKILLS_POOL["frameworks"][4:9]
    elif any(x in t for x in ["data engineer"]):
        pools = TECH_SKILLS_POOL["cloud_infra"] + TECH_SKILLS_POOL["languages"][:3]
    elif any(x in t for x in ["full stack", "backend", "frontend", "software"]):
        pools = TECH_SKILLS_POOL["frameworks"][6:] + TECH_SKILLS_POOL["languages"][1:5] + TECH_SKILLS_POOL["cloud_infra"][:4]
    elif any(x in t for x in ["devops", "cloud", "mlops", "sre", "platform"]):
        pools = TECH_SKILLS_POOL["cloud_infra"] + TECH_SKILLS_POOL["languages"][2:5]
    else:
        pools = ALL_TECH_SKILLS

    selected = random.sample(pools, min(count, len(pools)))
    # Add some random variation to scores
    result = []
    for s in selected:
        item = dict(s)
        item["endorsements"] = max(0, s["endorsements"] + random.randint(-15, 15))
        item["duration_months"] = max(1, s["duration_months"] + random.randint(-10, 12))
        result.append(item)
    return result


def gen_education(tier_weights=None) -> list:
    if not tier_weights:
        # Most candidates are tier 2-3
        tier = random.choices(
            ["tier_1", "tier_2", "tier_3", "tier_4"],
            weights=[10, 25, 40, 25]
        )[0]
    else:
        tier = random.choices(list(tier_weights.keys()), weights=list(tier_weights.values()))[0]

    institution = random.choice(INSTITUTION_TIERS[tier])
    field = random.choice(FIELDS)
    degree = random.choices(
        DEGREES,
        weights=[40, 15, 10, 3, 12, 5, 8, 7]
    )[0]
    return [{
        "tier": tier,
        "institution": institution,
        "degree": degree,
        "field_of_study": field,
    }]


def gen_career_history(title: str, years: float) -> list:
    history = []
    remaining = int(years * 12)
    is_tech = not any(x in title.lower() for x in ["hr", "marketing", "sales", "accountant", "graphic", "content", "civil", "mechanical"])

    num_jobs = random.choices([1, 2, 3, 4], weights=[20, 35, 30, 15])[0]
    for i in range(num_jobs):
        if remaining <= 0:
            break
        if remaining < 8:
            break
        duration = random.randint(8, min(remaining, 48))
        remaining -= duration

        # Weight company type by whether it's a tech role
        if is_tech:
            company = random.choices(ALL_COMPANIES, weights=[3 if c in PRODUCT_COMPANIES else 1 for c in ALL_COMPANIES])[0]
        else:
            company = random.choice(CONSULTING_COMPANIES + ["Various Companies"])

        desc = random.choice(JOB_DESCRIPTIONS) if is_tech else "Managed team operations and stakeholder relations"
        history.append({
            "company": company,
            "duration_months": duration,
            "description": desc,
        })
    return history


def gen_exam_scores(skills: list) -> dict:
    # ~60% of candidates have taken at least one exam
    if random.random() > 0.6:
        return {}
    scores = {}
    for s in random.sample(skills, min(random.randint(1, 3), len(skills))):
        # Exam scores reflect proficiency
        base = {"beginner": 45, "intermediate": 65, "advanced": 80, "expert": 92}.get(s.get("proficiency", "beginner"), 60)
        scores[s["name"]] = min(100, max(30, base + random.randint(-10, 8)))
    return scores


def generate_candidate(idx: int) -> dict:
    # 70% tech, 30% non-tech
    is_tech = random.random() < 0.70
    title_pool = TECH_TITLES if is_tech else NON_TECH_TITLES
    title = random.choice(title_pool)

    years = round(random.uniform(0.5, 18.0), 1)
    location = random.choice(LOCATIONS)

    num_skills = random.randint(3, 12) if is_tech else random.randint(2, 6)
    skills = gen_skills_for_title(title, num_skills) if is_tech else []

    education = gen_education(
        {"tier_1": 15, "tier_2": 30, "tier_3": 35, "tier_4": 20} if is_tech else None
    )

    career_history = gen_career_history(title, years)
    exam_scores = gen_exam_scores(skills)

    open_to_work = random.choices([True, False], weights=[55, 45])[0]
    response_rate = round(random.uniform(0.05, 1.0), 2)
    github_score = round(random.uniform(0, 100), 1) if is_tech and random.random() > 0.3 else -1
    interview_rate = round(random.uniform(0.2, 1.0), 2)
    notice_period = random.choice([0, 15, 30, 45, 60, 90])
    saved_30d = random.randint(0, 20)

    # Last active: most are moderately recent
    days_ago = random.choices(
        [7, 30, 90, 180, 365, 730],
        weights=[20, 25, 20, 15, 12, 8]
    )[0]
    last_active = rand_date(days_ago + 10, max(0, days_ago - 10))

    return {
        "candidate_id": f"CAND_{idx:07d}",
        "current_title": title,
        "years_of_experience": years,
        "location": location,
        "skills": skills,
        "education": education,
        "career_history": career_history,
        "open_to_work": open_to_work,
        "recruiter_response_rate": response_rate,
        "github_activity_score": github_score,
        "interview_completion_rate": interview_rate,
        "notice_period_days": notice_period,
        "saved_by_recruiters_30d": saved_30d,
        "last_active_date": last_active,
        "skill_assessment_scores": exam_scores,
    }


def main():
    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "candidates_100k.jsonl")
    total = 100_000

    print(f"Generating {total:,} candidates -> {output_path}")
    with open(output_path, "w", encoding="utf-8") as f:
        for i in range(1, total + 1):
            candidate = generate_candidate(i)
            f.write(json.dumps(candidate, ensure_ascii=False) + "\n")
            if i % 10_000 == 0:
                print(f"  {i:,} / {total:,} done")

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nDone! {output_path} ({size_mb:.1f} MB, {total:,} candidates)")


if __name__ == "__main__":
    main()
