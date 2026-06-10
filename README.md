<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&amp;color=0:0f1117,50:7C3AED,100:4ecdc4&amp;height=200&amp;section=header&amp;text=SkillSync%20AI&amp;fontSize=52&amp;fontColor=ffffff&amp;fontAlignY=40&amp;desc=AI-Powered%20Candidate%20Ranking%20%26%20Proctoring%20Platform&amp;descAlignY=60&amp;descSize=18&amp;animation=fadeIn"/>
</div>

<div align="center">

![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18%2B-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-5%2B-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3%2B-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Free AI Fallbacks](https://img.shields.io/badge/Free%20AI%20Fallbacks-Groq%20%2B%20OpenRouter-7C3AED?style=for-the-badge)

> ⚡ **5-Signal AI Scoring · Proctor-Hardened Exams · 100K Candidate Dataset · Recruiter Analytics**

</div>

---

## 📌 Overview

SkillSync is an intelligent candidate discovery, matching, and ranking engine built for **Track 1 of the INDIA RUNS Hackathon by Redrob**. 
Traditional recruitment platforms fail by matching keywords statically, creating false positives (keyword-stuffed resumes) and false negatives (experts who omit jargon). SkillSync addresses this with a **5-signal weighted scoring model** coupled with **secure, proctored skill verification exams**, and real-time recruiter messaging/analytics.

The system natively parses candidate details and ranks them against target Job Descriptions using dynamic career context, skill depth, educational tiers, experience tolerances, and active behavioral engagement logs.

For a deep dive into the weights, equations, and design decisions of our scoring engine, read the **[METHODOLOGY.md](./METHODOLOGY.md)** document.

---

## ✨ Core Features

| Feature | Description |
|---|---|
| 🧠 **5-Signal Scorer** | Ranks candidates using Career Relevance (30%), Skills Depth (25%), Behavioral Signals (20%), Experience Fit (15%), and Education (10%). |
| 🛡️ **Proctor-Hardened Exam** | Anti-cheat shield blocking right-clicks, text selections, copy/cut/paste, DevTools access, browser print/save shortcuts, and tab switching. |
| 🔑 **Server-Side Verification** | Generates questions dynamically using Groq/OpenRouter and evaluates replies against an auto-purging server-side cache (`_exam_cache`). |
| 📂 **Dual Dataset Support** | Query either the SQL-based live applicant pool or the massive **100K candidate dataset** (`sample_submission.csv` format). |
| 🏢 **Recruiter Analytics** | Displays matching candidates with color-coded per-signal breakdown graphs and natural-language matching reasoning. |
| 📊 **Dynamic CSV Exporter** | Generates standard-aligned output CSVs with 16 comprehensive columns, fully compliant with Redrob submission specifications. |
| 💼 **Job Board & Tracker** | Recruiters can create, edit, or delete listings. Seekers can browse and track applications, indicating when they have "Applied". |
| 💬 **Candidate Q&A Queries** | Job seekers can rise custom requests or clarification questions directly to recruiters concerning target job opportunities. |

---

## 🗂️ Project Structure

```
skillsync/
├── METHODOLOGY.md                  # Detail of the 5-signal weighted AI scoring model
├── README.md                       # Main project landing page (this file)
├── backend/
│   ├── main.py                     # Entry point for the FastAPI server
│   ├── database.py                 # SQLite/PostgreSQL SQLAlchemy database setup
│   ├── models.py                   # SQLAlchemy schema mapping (User, JobSeekerProfile, etc.)
│   ├── schemas.py                  # Pydantic schemas for request/response validation
│   ├── generate_candidates.py      # Script to pre-populate candidate database (100K records)
│   ├── rank.py                     # 5-Signal scoring logic and parser utility functions
│   ├── test_e2e.py                 # Backend API integration and test harness
│   ├── add_queries_column.py       # DB migration script to enable Q&A query column
│   └── routers/
│       ├── auth.py                 # JWT signup, login, and token validation endpoints
│       ├── profile.py              # Candidate & Recruiter profile builders and viewer (auth-locked)
│       ├── jobs.py                 # Job posting, modification, deletion, and applications
│       ├── exam.py                 # Server-side proctored AI exam generator and submitter
│       └── ranking.py              # Main candidate matching and CSV export endpoints
└── frontend/
    ├── index.html                  # Single Page App wrapper
    ├── tailwind.config.js          # Tailwind CSS style utilities configuration
    ├── vite.config.js              # Vite packaging rules
    └── src/
        ├── App.jsx                 # Client router mapping pages
        ├── main.jsx                # DOM mounting execution
        ├── index.css               # Base styles and Tailwind imports
        └── pages/
            ├── Landing.jsx         # Modern landing portal introducing SkillSync
            ├── Login.jsx           # JWT-backed email authentication
            ├── Register.jsx        # Unified signup form (Job Seeker / Recruiter)
            ├── JobSeekerDashboard.jsx # Track active job statuses, exam history, and details
            ├── BrowseJobs.jsx      # Discover jobs, apply, and ask recruiter questions
            ├── ProfileBuilder.jsx  # Multi-step resume details parser and parser wizard
            ├── RecruiterDashboard.jsx # Post jobs, edit listings, and review applicant signals
            ├── RankCandidates.jsx  # Custom weights matcher, explainability charts, and CSV downloads
            └── SkillExam.jsx       # Proctored full-screen skill verification test interface
```

---

## 🚀 Getting Started

### Prerequisites
- **Python**: v3.10 or newer
- **Node.js**: v18 or newer
- **PostgreSQL**: Production-ready remote database (e.g. Supabase, or SQLite for local dev)
- **API Keys**: OpenRouter and/or Groq API key for generative assessments

### Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dharani25007-code/skillsync.git
   cd skillsync
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   # Set up a virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```

### Configuration

Create a `.env` file inside the `backend/` directory:
```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
SECRET_KEY=your-jwt-signing-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# AI Services Configurations (Free-tier first fallbacks)
GROQ_API_KEY_1=gsk_your_primary_key
GROQ_API_KEY_2=gsk_your_secondary_key
OPENROUTER_API_KEY=sk-or-your-fallback-key
```

### Running the App

1. **Generate Candidate Database**:
   Populate the environment database with the generated candidate pool:
   ```bash
   cd backend
   python generate_candidates.py
   ```

2. **Launch Backend Server**:
   ```bash
   uvicorn main:app --reload
   ```
   The backend API will be live on `http://127.0.0.1:8000`. You can inspect endpoints via Swagger UI at `/docs`.

3. **Launch Frontend Dev Server**:
   ```bash
   cd ../frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🤖 AI Fallback Chain (Free-First)

SkillSync runs on a free-tier fallback architecture to avoid rate limit locks during high-concurrency hackathon evaluations:

| Phase | Model Option | Source | Role |
|---|---|---|---|
| **Primary** | `llama-3.3-70b-instruct` | Groq | Ultra-fast question formulation and profiling |
| **Secondary** | `llama-3.1-8b-instruct` | Groq | Light-weight fallback for scoring reviews |
| **Tertiary** | `mixtral-8x7b-32768` | Groq | High-context fallback |
| **Fallback** | `gemma-3-4b-it:free` | OpenRouter | Remote API failure resilience |

---

## 🧰 Tech Stack

| Dependency | Category | Role |
|---|---|---|
| **FastAPI** | Backend | Core REST API web framework & routers |
| **React + Vite** | Frontend | Reactive view layer and building pipeline |
| **Supabase (PostgreSQL)** | DB | Database storing jobs, applicants, users, and exams |
| **SQLAlchemy** | ORM | Relational schema mapping and query operations |
| **Tailwind CSS** | Styling | Modern, responsive glassmorphic interfaces |
| **PyJWT** | Security | JSON Web Token user authorization security |
| **Bcrypt** | Encryption | Secure password hashing algorithms |
| **Pydantic** | Validation | Datatype mapping and API request parsing |

---

## 🔒 Security & Proctoring Controls

- **Secure JWT Authentication**: All sensitive routes, including profile lists (`/jobseeker/all`) and application management, are locked behind token validation.
- **Server-Side Exam Cache**: Exam answers never hit the client-side bundle. They are stored inside an auto-purging (`_exam_cache`) dictionary on the server.
- **Strict Proctor Shield**: 
  - Clipboard `copy`, `cut`, and `paste` events are hard-blocked during exams.
  - Text selection is completely disabled (`user-select: none`).
  - Right-click context menus are overridden.
  - Keyboard shortcuts (`Ctrl+C`, `Ctrl+V`, `F12`, `PrintScreen`, etc.) are intercepted.
  - Window tab changes are tracked; 3 warnings trigger an automated exam submission.

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&amp;color=0:4ecdc4,100:0f1117&amp;height=120&amp;section=footer"/>

**Built for Track 1 | Redrob INDIA RUNS Hackathon**
</div>