from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import SkillExamAttempt, JobSeekerProfile
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
import os
import json
import httpx
import time

# ── Server-side exam answer cache (anti-cheat) ─────────────────
# Stores {user_id: {"questions": [...], "created_at": timestamp}}
# Answers NEVER leave the server — client only gets question text + options
_exam_cache: dict = {}

load_dotenv()

router = APIRouter(prefix="/exam", tags=["Skill Exam"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
GROQ_API_KEY_1 = os.getenv("GROQ_API_KEY_1")
GROQ_API_KEY_2 = os.getenv("GROQ_API_KEY_2")

# Best free models on Groq
GROQ_MODELS = [
    "llama-3.3-70b-versatile",   # Most powerful free
    "llama-3.1-8b-instant",      # Fastest free
    "gemma2-9b-it",              # Good quality free alternative
]


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def call_groq(prompt: str, api_key: str, model: str = "llama-3.3-70b-versatile") -> str:
    """Call Groq API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert technical interviewer. Generate MCQ exam questions. Always respond with valid JSON only. No markdown, no explanation, no backticks."
                    },
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 3000,
                "temperature": 0.7
            }
        )
        if response.status_code != 200:
            raise Exception(f"Groq API error: {response.status_code} - {response.text}")
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def generate_questions_groq(skill_name: str, difficulty: str = "intermediate") -> list:
    """Generate 10 MCQ questions using Groq API with fallback"""

    prompt = f"""Generate exactly 10 multiple choice questions to test {skill_name} knowledge at {difficulty} level.

Return ONLY a valid JSON array with this exact structure (no markdown, no backticks):
[
  {{
    "id": 1,
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "Brief explanation why this is correct"
  }}
]

Rules:
- correct_answer is the INDEX (0, 1, 2, or 3) of correct option
- Test real practical knowledge of {skill_name}
- Mix of conceptual and practical questions
- Make options realistic and challenging
- Return ONLY the JSON array, nothing else"""

    # Try key 1 with best model
    for api_key in [GROQ_API_KEY_1, GROQ_API_KEY_2]:
        if not api_key or api_key == "your-first-groq-api-key-here":
            continue
        for model in GROQ_MODELS:
            try:
                result = await call_groq(prompt, api_key, model)
                result = result.strip()
                # Clean any accidental markdown
                if "```" in result:
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]
                result = result.strip()
                questions = json.loads(result)
                if isinstance(questions, list) and len(questions) > 0:
                    print(f"✅ Generated {len(questions)} questions using {model}")
                    return questions
            except Exception as e:
                print(f"⚠️ Failed with {model}: {e}")
                continue

    # Fallback — use hardcoded questions if API fails
    print("⚠️ Using fallback questions (add Groq API key for AI-generated questions)")
    return generate_fallback_questions(skill_name)


def generate_fallback_questions(skill_name: str) -> list:
    """Fallback questions when API is not available"""
    skill_lower = skill_name.lower()

    if "python" in skill_lower:
        return [
            {"id": 1, "question": "What is the output of print(type([]))?", "options": ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'dict'>"], "correct_answer": 0, "explanation": "[] creates an empty list in Python"},
            {"id": 2, "question": "Which keyword is used to define a function in Python?", "options": ["function", "def", "func", "define"], "correct_answer": 1, "explanation": "def is the keyword used to define functions in Python"},
            {"id": 3, "question": "What does list.append() do?", "options": ["Removes last element", "Adds element at beginning", "Adds element at end", "Sorts the list"], "correct_answer": 2, "explanation": "append() adds an element to the end of a list"},
            {"id": 4, "question": "What is a Python decorator?", "options": ["A design pattern", "A function that modifies another function", "A class method", "A module"], "correct_answer": 1, "explanation": "Decorators are functions that modify the behavior of other functions"},
            {"id": 5, "question": "What is the difference between list and tuple?", "options": ["No difference", "Lists are immutable, tuples are mutable", "Lists are mutable, tuples are immutable", "Tuples can only store numbers"], "correct_answer": 2, "explanation": "Lists are mutable (can be changed), tuples are immutable"},
            {"id": 6, "question": "What does 'self' refer to in a Python class?", "options": ["The class itself", "The parent class", "The instance of the class", "A global variable"], "correct_answer": 2, "explanation": "self refers to the current instance of the class"},
            {"id": 7, "question": "What is a Python generator?", "options": ["A function that returns a list", "A function that yields values lazily", "A class that generates objects", "A module for random numbers"], "correct_answer": 1, "explanation": "Generators yield values one at a time using the yield keyword"},
            {"id": 8, "question": "What is the GIL in Python?", "options": ["Global Import Library", "Global Interpreter Lock", "General Input Layer", "Garbage Input Loop"], "correct_answer": 1, "explanation": "GIL is a mutex that prevents multiple threads from executing Python code simultaneously"},
            {"id": 9, "question": "What does __init__ do in Python?", "options": ["Deletes an object", "Initializes a class instance", "Imports a module", "Creates a list"], "correct_answer": 1, "explanation": "__init__ is the constructor method called when creating a new instance"},
            {"id": 10, "question": "What is list comprehension?", "options": ["A way to sort lists", "A concise way to create lists", "A method to merge lists", "A way to delete list items"], "correct_answer": 1, "explanation": "List comprehension provides a concise way to create lists: [x for x in range(10)]"},
        ]
    elif "machine learning" in skill_lower or "ml" in skill_lower:
        return [
            {"id": 1, "question": "What is overfitting in machine learning?", "options": ["Model performs well on training but poor on new data", "Model performs poorly on all data", "Model is too simple", "Model trains too slowly"], "correct_answer": 0, "explanation": "Overfitting occurs when a model memorizes training data but fails to generalize"},
            {"id": 2, "question": "What is cross-validation used for?", "options": ["Speed up training", "Evaluate model performance reliably", "Increase dataset size", "Reduce model complexity"], "correct_answer": 1, "explanation": "Cross-validation provides a reliable estimate of model performance on unseen data"},
            {"id": 3, "question": "What is the difference between supervised and unsupervised learning?", "options": ["Speed of training", "Supervised uses labeled data, unsupervised does not", "Number of features", "Size of dataset"], "correct_answer": 1, "explanation": "Supervised learning uses labeled training data, unsupervised finds patterns without labels"},
            {"id": 4, "question": "What does gradient descent do?", "options": ["Increases model complexity", "Minimizes the loss function", "Splits the dataset", "Normalizes features"], "correct_answer": 1, "explanation": "Gradient descent iteratively updates parameters to minimize the loss function"},
            {"id": 5, "question": "What is a confusion matrix?", "options": ["A matrix showing model weights", "A table showing prediction vs actual results", "A visualization of features", "A loss calculation method"], "correct_answer": 1, "explanation": "A confusion matrix shows TP, TN, FP, FN to evaluate classification performance"},
            {"id": 6, "question": "What is regularization?", "options": ["Making data regular", "Technique to prevent overfitting by adding penalty", "Normalizing output", "Splitting data"], "correct_answer": 1, "explanation": "Regularization adds a penalty to the loss function to prevent overfitting"},
            {"id": 7, "question": "What is the bias-variance tradeoff?", "options": ["Speed vs accuracy", "Balance between underfitting and overfitting", "Training vs test size", "Model complexity vs data size"], "correct_answer": 1, "explanation": "High bias = underfitting, high variance = overfitting; we need to balance both"},
            {"id": 8, "question": "What is feature engineering?", "options": ["Building hardware for ML", "Creating/transforming features to improve model performance", "Selecting the best model", "Cleaning data"], "correct_answer": 1, "explanation": "Feature engineering involves creating new features or transforming existing ones to improve ML models"},
            {"id": 9, "question": "What is ROC-AUC?", "options": ["A training algorithm", "Metric measuring classifier performance at all thresholds", "A regularization technique", "A neural network layer"], "correct_answer": 1, "explanation": "ROC-AUC measures the ability of a classifier to distinguish between classes"},
            {"id": 10, "question": "What is an ensemble method?", "options": ["A single powerful model", "Combining multiple models to improve performance", "A data augmentation technique", "A feature selection method"], "correct_answer": 1, "explanation": "Ensemble methods like Random Forest combine multiple models for better predictions"},
        ]
    else:
        # Generic technical questions
        return [
            {"id": i+1, "question": f"Which concept is fundamental to {skill_name}?", "options": [f"Core concept {i*4+1}", f"Core concept {i*4+2}", f"Core concept {i*4+3}", f"Core concept {i*4+4}"], "correct_answer": 0, "explanation": f"This tests basic knowledge of {skill_name}"}
            for i in range(10)
        ]


# ── Schemas ────────────────────────────────────────────────────

class StartExamRequest(BaseModel):
    skill_name: str
    difficulty: Optional[str] = "intermediate"


class SubmitExamRequest(BaseModel):
    skill_name: str
    answers: List[int]
    time_taken_seconds: Optional[int] = 600


# ── Endpoints ──────────────────────────────────────────────────

@router.post("/generate")
async def generate_exam(
    req: StartExamRequest,
    user_id: int = Depends(get_current_user)
):
    """Generate exam questions for a skill using Groq AI"""
    questions = await generate_questions_groq(req.skill_name, req.difficulty)

    # ── SECURITY: Store full questions server-side only ─────────
    _exam_cache[user_id] = {
        "questions": questions,
        "skill_name": req.skill_name,
        "created_at": time.time()
    }

    # ── Clean old cache entries (older than 30 min) ────────────
    now = time.time()
    expired = [uid for uid, data in _exam_cache.items() if now - data["created_at"] > 1800]
    for uid in expired:
        del _exam_cache[uid]

    # ── Send ONLY question text + options to browser (NO answers) ──
    questions_safe = [
        {"id": q["id"], "question": q["question"], "options": q["options"]}
        for q in questions
    ]

    return {
        "skill": req.skill_name,
        "difficulty": req.difficulty,
        "total_questions": len(questions_safe),
        "time_limit_seconds": 600,
        "questions": questions_safe
    }


@router.post("/submit")
async def submit_exam(
    req: SubmitExamRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Submit exam answers and calculate score using SERVER-SIDE answer key"""

    # ── SECURITY: Use server-side cached answers, NOT client-submitted ones ──
    cached = _exam_cache.get(user_id)
    if not cached:
        raise HTTPException(
            status_code=400,
            detail="No active exam session found. Please start a new exam."
        )

    questions = cached["questions"]
    if not questions:
        raise HTTPException(status_code=400, detail="No questions in exam session")

    # Remove from cache after use (one-time submit)
    del _exam_cache[user_id]

    # Calculate score using SERVER-SIDE correct answers
    correct = 0
    results = []

    for i, q in enumerate(questions):
        if i < len(req.answers):
            user_answer = req.answers[i]
            correct_answer = q.get("correct_answer", 0)
            is_correct = user_answer == correct_answer
            if is_correct:
                correct += 1
            results.append({
                "question": q.get("question", ""),
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "explanation": q.get("explanation", "")
            })

    total = len(questions)
    score = round((correct / total) * 100, 1) if total > 0 else 0
    passed = score >= 60

    # Save exam attempt
    try:
        attempt = SkillExamAttempt(
            user_id=user_id,
            skill_name=req.skill_name,
            score=score,
            total_questions=total,
            correct_answers=correct,
            time_taken_seconds=req.time_taken_seconds or 600,
            passed=passed,
            questions=questions,
            answers=req.answers
        )
        db.add(attempt)

        # Update skill assessment score in profile
        profile = db.query(JobSeekerProfile).filter(
            JobSeekerProfile.user_id == user_id
        ).first()

        if profile:
            scores = profile.skill_assessment_scores or {}
            # Keep best score
            if req.skill_name not in scores or scores[req.skill_name] < score:
                scores[req.skill_name] = score
            profile.skill_assessment_scores = scores

            # Update skill exam_score in skills array
            skills = profile.skills or []
            skill_found = False
            for skill in skills:
                if skill.get("name", "").lower() == req.skill_name.lower():
                    skill["exam_score"] = score
                    skill_found = True
                    break

            if not skill_found and passed:
                skills.append({
                    "name": req.skill_name,
                    "proficiency": "intermediate" if score < 80 else "advanced",
                    "endorsements": 0,
                    "duration_months": 0,
                    "exam_score": score
                })

            profile.skills = skills

        db.commit()
    except Exception as e:
        print(f"DB save error: {e}")

    return {
        "skill": req.skill_name,
        "score": score,
        "correct": correct,
        "total": total,
        "passed": passed,
        "results": results,
        "message": f"You scored {score}%! {'✅ Skill Verified! Badge added to profile.' if passed else '❌ Score below 60%. Try again to improve!'}"
    }


@router.get("/history")
def get_exam_history(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    """Get all exam attempts for a user"""
    try:
        attempts = db.query(SkillExamAttempt).filter(
            SkillExamAttempt.user_id == user_id
        ).order_by(SkillExamAttempt.created_at.desc()).all()
        return attempts
    except Exception:
        return []