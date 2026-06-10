# SkillSync — AI Candidate Ranking System
## Methodology & Architecture

> **Track 1 | INDIA RUNS Hackathon by Redrob**
> Built to go beyond keyword filters and surface the *right* people for every role.

---

## Problem Statement

Traditional ATS systems match candidates by keyword overlap — a candidate who lists "Python" gets the same treatment whether they've used it for 6 months or 6 years. This creates:
- **False positives**: Keyword stuffers with no real depth
- **False negatives**: Experts who don't write keyword-heavy CVs
- **No signal on engagement**: Is the candidate even actively looking?

**SkillSync solves this with a 5-signal weighted scoring model.**

---

## Architecture Overview

```
Job Description (text)
       │
       ▼
┌─────────────────────┐
│  JD Parser          │  → Extracts: required skills, experience range, target title
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  5-Signal Scorer    │  → Scores each candidate on 5 independent signals
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Weighted Combiner  │  → Final score = weighted sum of 5 signals
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Ranked Output      │  → Top-N candidates with per-signal explainability
└─────────────────────┘
```

**Stack**: Python · FastAPI · SQLite · React · Vite · Tailwind CSS

---

## The 5-Signal Model

### Signal 1 — Career Relevance (30% weight)

**What it measures**: Does the candidate's professional trajectory align with this role?

This goes far beyond title matching. We analyze:

| Sub-signal | What we check |
|-----------|---------------|
| Current title | Exact and partial word match against the JD role |
| Bad title penalty | Completely irrelevant titles (e.g., HR Manager applying for ML Engineer) get a massive final score penalty (×0.15) |
| Good title bonus | "Engineer", "Scientist", "Architect", "Lead", "Data", "ML", "AI" in title → +0.2 |
| Career history content | Role descriptions containing "ranking", "retrieval", "NLP", "LLM", "RAG", "vector", "ML pipeline" → +0.05 per match |
| Product company bonus | Experience at Google, Microsoft, Amazon, Meta, Swiggy, Flipkart, Razorpay, etc. → +0.08 per job |
| Consulting ratio penalty | >80% of career at body-shopping firms (TCS, Infosys, Wipro etc.) → −0.25 |
| Product depth bonus | >24 months total in product companies → +0.10 |

**Why this matters**: A candidate who spent 5 years at consulting firms doing CRUD work is fundamentally different from one who spent 2 years building ML pipelines at a product startup. Keywords alone can't distinguish them.

---

### Signal 2 — Skills Depth (25% weight)

**What it measures**: Not just *which* skills, but *how well* the candidate knows them.

Each skill is scored on four dimensions:

```
Skill Score = proficiency + endorsement_bonus + duration_bonus + exam_bonus
```

| Dimension | Range | How scored |
|-----------|-------|-----------|
| Proficiency level | 0.2–1.0 | beginner=0.2, intermediate=0.5, advanced=0.8, expert=1.0 |
| Endorsements | 0–0.3 | Linear scale up to 50 endorsements |
| Duration | 0–0.2 | Linear scale up to 48 months |
| Exam score | 0–0.3 | SkillSync verified assessment score / 100 × 0.3 |

**The exam bonus is our biggest differentiator.** SkillSync runs proctored skill assessments. A candidate with Python: Advanced + 92% exam score is ranked significantly higher than one who just lists "Python: Expert" with no verification.

Final skills score = normalized average of all matching skill scores × breadth bonus.

---

### Signal 3 — Experience Match (15% weight)

**What it measures**: How close is the candidate's experience to what the JD actually needs?

We extract the target experience range from the JD (e.g., "5+ years" → target = 5–20, midpoint = 12.5).

```
exp_score = max(0.1, 1.0 − (|candidate_years − target_midpoint| / target) × 0.8)
```

**Why not "more experience = better"?** A 15-year veteran is often a bad fit for a role seeking 3–5 years. Overqualified candidates churn quickly and cost more. This signal rewards the *right fit*, not the most experience.

---

### Signal 4 — Behavioral Signals (20% weight)

**What it measures**: Real-world engagement and availability signals that predict hiring success.

| Signal | Weight | Reasoning |
|--------|--------|-----------|
| Open to work flag | +0.25 | Direct intent — dramatically improves reachability |
| Recruiter response rate | ×0.2 | Historical engagement — do they reply to messages? |
| Last active date (≤30 days) | +0.15 | Actively job-seeking, profile up to date |
| Last active date (31–90 days) | +0.08 | Recently active |
| Last active date (>365 days) | −0.15 | Ghost risk — profile stale |
| GitHub activity score | ×0.1 | Real coding activity, not just listed skills |
| Interview completion rate | ×0.05 | Reliability — do they show up? |
| Notice period ≤30 days | +0.05 | Fast availability |
| Saved by recruiters (30d) | +0.05 | External validation |

**This is the signal that goes furthest beyond keyword matching.** A candidate with 70% recruiter response rate who is actively open to work is far more valuable than an equally-skilled passive candidate.

---

### Signal 5 — Education (10% weight)

**What it measures**: Academic foundation quality.

| Dimension | Scoring |
|-----------|---------|
| Institution tier | tier_1=1.0, tier_2=0.8, tier_3=0.6, tier_4=0.4 |
| Relevant field | CS / Software / Data / AI / Math / Statistics → +0.2 |
| Degree level | Ph.D/M.Tech/M.S → +0.2, B.Tech/B.E → +0.1 |

Education is weighted lowest (10%) intentionally — real-world skills and behavioral signals matter more than where someone studied, especially in AI/ML where self-taught practitioners often outperform degree holders.

---

## Final Score Computation

```python
final_score = (
    career_score    × 0.30 +
    skills_score    × 0.25 +
    behavioral_score × 0.20 +
    exp_score       × 0.15 +
    edu_score       × 0.10
)

# Hard penalty for completely irrelevant roles
if has_irrelevant_title:
    final_score = final_score × 0.15
```

The irrelevant title penalty is intentionally severe. An HR Manager applying for a Senior ML Engineer role should not appear in the top 50 regardless of their response rate or other signals.

---

## JD Intelligence

The JD parser extracts structured requirements from free-text job descriptions:

1. **Skill extraction**: Matches against a curated list of 50+ tech skills across ML, cloud, databases, frameworks
2. **Experience range**: Regex extraction of year requirements with decimal support (`"5.5+ years"`)
3. **Target title**: Extracted for non-tech JD title matching
4. **JD type detection**: Tech JD (has required skills) vs Non-tech JD (title match is primary)

For **non-tech JDs** (e.g., "Marketing Manager"), the system switches to title-match-first mode, where career relevance is computed by word-level overlap between the JD title and candidate title.

---

## Explainability

Every ranked candidate comes with:
- **Overall match score** (0–100%)
- **Per-signal breakdown** (5 individual scores shown as colored bars)
- **Natural language reasoning** explaining the top factors that drove their ranking
- **Matching skills list** highlighting the specific skills that contributed to their score

This is not a black box. Every score can be traced back to a specific data point in the candidate's profile.

---

## Dataset

- **SkillSync Live DB**: Real registered users with verified exam scores
- **INDIA RUNS Dataset**: The official candidate pool (`sample_submission.csv`) provided by Redrob for the hackathon, containing real candidate profiles mapped directly to their unique candidate IDs.
- **CSV Upload**: Recruiter's own candidate pool in standard format

---

## Why This Beats Keyword Matching

| Capability | Keyword Filter | SkillSync |
|-----------|---------------|-----------|
| Detects skill depth | ❌ | ✅ (proficiency + exam) |
| Rewards product company exp | ❌ | ✅ |
| Penalizes irrelevant roles | ❌ | ✅ |
| Uses behavioral signals | ❌ | ✅ |
| Differentiates overqualified | ❌ | ✅ |
| Fully explainable output | ❌ | ✅ |
| Handles non-tech JDs | ⚠️ | ✅ |
| Verifies skills via assessment | ❌ | ✅ |
