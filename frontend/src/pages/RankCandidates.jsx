import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API = 'http://127.0.0.1:8000'

// Signal metadata: label, color, icon, description
const SIGNALS = [
  {
    key: 'career',
    label: 'Career Fit',
    icon: '🏢',
    color: '#14b8a6',
    desc: 'Title relevance, company quality, career history alignment',
  },
  {
    key: 'skills',
    label: 'Skills Depth',
    icon: '🔧',
    color: '#6366f1',
    desc: 'Proficiency level, endorsements, exam scores, skill duration',
  },
  {
    key: 'experience',
    label: 'Experience Match',
    icon: '📅',
    color: '#f59e0b',
    desc: 'How closely years of experience match JD requirements',
  },
  {
    key: 'behavioral',
    label: 'Engagement',
    icon: '⚡',
    color: '#10b981',
    desc: 'Open-to-work, response rate, GitHub activity, recency',
  },
  {
    key: 'education',
    label: 'Education',
    icon: '🎓',
    color: '#ec4899',
    desc: 'Institution tier, field of study, degree level',
  },
]

const WEIGHTS = {
  career: 30,
  skills: 25,
  behavioral: 20,
  experience: 15,
  education: 10,
}

function ScoreBar({ value, color, animate = true }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

function CandidateCard({ r, rank, expanded, onToggle }) {
  const sig = r.signal_scores || {}
  const scoreColor =
    r.score >= 0.75 ? '#14b8a6' : r.score >= 0.55 ? '#6366f1' : r.score >= 0.35 ? '#f59e0b' : '#ef4444'
  const rankBg =
    rank === 1
      ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
      : rank === 2
      ? 'bg-gradient-to-br from-slate-400 to-gray-500'
      : rank === 3
      ? 'bg-gradient-to-br from-orange-400 to-amber-600'
      : 'bg-gray-400 dark:bg-gray-600'

  const skills = r.skills || r.matching_skills || []

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden
        ${rank === 1 ? 'border-teal-400 shadow-lg shadow-teal-500/10' : 'border-gray-200 dark:border-gray-800'}
        bg-white dark:bg-gray-900 hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500`}
    >
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Rank badge + info */}
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${rankBg}`}
            >
              #{rank}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  {r.name || r.candidate_id || 'Candidate'}
                </h3>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md font-mono">
                  {r.candidate_id}
                </span>
                {r.open_to_work && (
                  <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                    ✅ Open to Work
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {r.current_title || 'Professional'} · {r.years_of_experience ? `${r.years_of_experience} yrs` : 'Exp N/A'}{r.location ? ` · ${r.location}` : ''}
              </p>
            </div>
          </div>

          {/* Score ring */}
          <div className="flex-shrink-0 text-right">
            <div className="text-3xl font-black" style={{ color: scoreColor }}>
              {Math.round(r.score * 100)}
              <span className="text-lg font-semibold">%</span>
            </div>
            <div className="text-xs text-gray-400 font-medium">AI Match</div>
          </div>
        </div>

        {/* Mini score bar */}
        <div className="mt-3 w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${r.score * 100}%`, backgroundColor: scoreColor }}
          />
        </div>

        {/* Reasoning */}
        {r.reasoning && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
            💡 {r.reasoning}
          </p>
        )}

        {/* Skills chips */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(r.matching_skills?.length > 0 ? r.matching_skills : skills).slice(0, 6).map((s, j) => (
              <span
                key={j}
                className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium"
              >
                {typeof s === 'object' ? s.name : s}
              </span>
            ))}
            {skills.length > 6 && (
              <span className="text-xs text-gray-400 px-1">+{skills.length - 6} more</span>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {expanded ? '▲ Hide signal breakdown' : '▼ Show signal breakdown'}
        </button>
      </div>

      {/* Explainability Panel */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-5 pb-5 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">🔍 Score Breakdown</span>
            <span className="text-xs text-gray-400">(hover for details)</span>
          </div>
          <div className="space-y-3">
            {SIGNALS.map((sig_meta) => {
              const val = sig[sig_meta.key] ?? 0
              return (
                <div key={sig_meta.key} className="group relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{sig_meta.icon}</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {sig_meta.label}
                      </span>
                      <span className="text-xs text-gray-400">({WEIGHTS[sig_meta.key]}% weight)</span>
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: sig_meta.color }}
                    >
                      {Math.round(val * 100)}%
                    </span>
                  </div>
                  <ScoreBar value={val} color={sig_meta.color} />
                  <p className="text-xs text-gray-400 mt-0.5 hidden group-hover:block">
                    {sig_meta.desc}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Contribution breakdown */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Weighted contribution to final score</p>
            <div className="grid grid-cols-5 gap-1 text-center">
              {SIGNALS.map((s) => {
                const raw = sig[s.key] ?? 0
                const contrib = raw * (WEIGHTS[s.key] / 100)
                return (
                  <div key={s.key} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                    <div className="text-sm">{s.icon}</div>
                    <div className="text-xs font-bold mt-0.5" style={{ color: s.color }}>
                      {Math.round(contrib * 100)}%
                    </div>
                    <div className="text-[10px] text-gray-400 leading-tight">{s.label.split(' ')[0]}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RankCandidates() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const [step, setStep] = useState(1)
  const [jd, setJd] = useState('')
  const [datasetOption, setDatasetOption] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [totalRanked, setTotalRanked] = useState(0)
  const [jdRequirements, setJdRequirements] = useState(null)
  const [error, setError] = useState('')
  const [expandedCards, setExpandedCards] = useState({})
  const [expandAll, setExpandAll] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggleCard = (idx) => {
    setExpandedCards((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const toggleAll = () => {
    const next = !expandAll
    setExpandAll(next)
    const map = {}
    results.forEach((_, i) => (map[i] = next))
    setExpandedCards(map)
  }

  const handleRank = async () => {
    if (!jd.trim()) return
    setLoading(true)
    setError('')
    setStep(3)
    setExpandedCards({})
    setExpandAll(false)

    try {
      const token = localStorage.getItem('token')

      let res
      if (datasetOption === 'upload') {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('jd_text', jd)
        formData.append('top_n', 20)
        res = await axios.post(`${API}/ranking/rank_upload`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        res = await axios.post(
          `${API}/ranking/rank`,
          { jd_text: jd, dataset_source: datasetOption, top_n: 20 },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }

      setResults(res.data.results || [])
      setTotalRanked(res.data.total_ranked || 0)
      setJdRequirements(res.data.jd_requirements)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ranking failed. Please try again.')
      setStep(2)
    }
    setLoading(false)
  }

  const downloadCSV = () => {
    const headers = [
      'rank',
      'candidate_id',
      'name',
      'current_title',
      'years_of_experience',
      'location',
      'skills',
      'open_to_work',
      'recruiter_response_rate',
      'score',
      'career_score',
      'skills_score',
      'experience_score',
      'behavioral_score',
      'education_score',
      'reasoning'
    ]
    const rows = results.map((r) => {
      const skillsList = r.skills || r.matching_skills || []
      const skillsStr = skillsList.map(s => typeof s === 'object' ? s.name : s).join(', ')
      return [
        r.rank,
        r.candidate_id,
        r.name || '',
        r.current_title || '',
        r.years_of_experience ?? '',
        r.location || '',
        `"${skillsStr.replace(/"/g, '""')}"`,
        r.open_to_work ?? '',
        r.recruiter_response_rate ?? '',
        r.score,
        r.signal_scores?.career ?? '',
        r.signal_scores?.skills ?? '',
        r.signal_scores?.experience ?? '',
        r.signal_scores?.behavioral ?? '',
        r.signal_scores?.education ?? '',
        `"${(r.reasoning || '').replace(/"/g, "'")}"`,
      ]
    })
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'skillsync_ranked_candidates.csv'
    a.click()
  }

  // ── Step 1: JD Input ─────────────────────────────────────────
  const renderStep1 = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
          🎯 AI Candidate Ranking
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Paste your job description — our 5-signal AI model ranks the best candidates with full explainability
        </p>
      </div>

      {/* How it works — 5 signals */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {SIGNALS.map((s) => (
          <div
            key={s.key}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 text-center"
          >
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{s.label}</div>
            <div className="text-xs font-black mt-1" style={{ color: s.color }}>{WEIGHTS[s.key]}%</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
          Job Description *
        </label>
        <textarea
          placeholder="e.g. We are looking for a Senior ML Engineer with 5+ years of experience in Python, machine learning, NLP, embeddings, and vector databases. The candidate should have experience building production-grade AI systems..."
          value={jd}
          rows={10}
          onChange={(e) => setJd(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none text-sm"
        />
        <div className="mt-3 flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-400">Quick fill:</span>
          {[
            'Senior ML Engineer with Python, NLP, LLM, embeddings experience',
            'Full Stack Developer with React, Node.js and 3+ years experience',
            'Data Scientist with 5+ years Python, statistics, deep learning',
            'Senior AI Engineer specializing in LLM fine-tuning and RAG systems',
          ].map((t) => (
            <button
              key={t}
              onClick={() =>
                setJd(
                  `We are looking for a ${t}. The role requires strong problem-solving skills and the ability to work in a fast-paced product environment.`
                )
              }
              className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-gray-600 dark:text-gray-400 hover:text-teal-500 px-2 py-1 rounded-lg transition-all"
            >
              {t.length > 45 ? t.slice(0, 45) + '…' : t}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setStep(2)}
        disabled={!jd.trim()}
        className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-teal-500/20"
      >
        Next — Choose Dataset →
      </button>
    </div>
  )

  // ── Step 2: Dataset picker ───────────────────────────────────
  const renderStep2 = () => (
    <div>
      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Choose Candidate Dataset</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Where should we find candidates to rank?</p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-8">
        {[
          {
            id: 'skillsync',
            icon: '👥',
            title: 'SkillSync Live Database',
            desc: 'Use verified candidates who registered on SkillSync — with AI exam scores and behavioral signals',
            badge: '✅ Verified Skills',
            badgeColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
          },
          {
            id: 'hackathon',
            icon: '📊',
            title: 'INDIA RUNS Dataset',
            desc: 'Use the official India Runs hackathon dataset (sample_submission.csv) containing the real candidate profiles',
            badge: 'Official Dataset',
            badgeColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
          },
          {
            id: 'upload',
            icon: '📁',
            title: 'Upload Your Own CSV',
            desc: 'Upload your own candidate dataset. Supports: name, title, experience, skills, response_rate columns',
            badge: 'Custom Data',
            badgeColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
          },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setDatasetOption(opt.id)}
            className={`border-2 rounded-2xl p-5 text-left transition-all ${
              datasetOption === opt.id
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-md shadow-teal-500/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-teal-300 bg-white dark:bg-gray-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <div className="font-bold text-gray-900 dark:text-white">{opt.title}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </div>
              {datasetOption === opt.id && (
                <span className="ml-auto text-teal-500 text-lg">✓</span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 ml-9">{opt.desc}</p>
          </button>
        ))}
      </div>

      {datasetOption === 'upload' && (
        <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center mb-6">
          <div className="text-4xl mb-3">📤</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Upload your candidates CSV file
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
            id="csvUpload"
          />
          <label
            htmlFor="csvUpload"
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium cursor-pointer transition-all"
          >
            Choose File
          </label>
          {file && (
            <p className="text-teal-500 mt-3 text-sm font-medium">✅ {file.name} selected</p>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => { setStep(1); setError('') }}
          className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 rounded-xl font-medium transition-all"
        >
          ← Back
        </button>
        <button
          onClick={handleRank}
          disabled={!datasetOption || (datasetOption === 'upload' && !file)}
          className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20"
        >
          🚀 Rank Candidates with AI
        </button>
      </div>
    </div>
  )

  // ── Step 3: Results ──────────────────────────────────────────
  const renderStep3 = () => (
    <div>
      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">AI Ranking Results</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Candidates ranked by 5-signal AI model — click any card to see the full explainability breakdown
      </p>

      {loading ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4 animate-pulse">🧠</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            AI is analyzing candidates…
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Parsing JD → Extracting signals → Scoring 5 dimensions → Ranking
          </p>
          <div className="flex justify-center gap-1 mt-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* JD analysis card */}
          {jdRequirements && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">📋 JD Intelligence</span>
                <span className="text-xs text-indigo-400">Extracted from your job description</span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs bg-white dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-700 font-medium">
                  📅 {jdRequirements.min_exp}–{jdRequirements.max_exp} years exp
                </span>
                {jdRequirements.required_skills?.slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="text-xs bg-white dark:bg-indigo-900/50 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800 font-medium capitalize"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-xs text-indigo-400 mt-2">
                Ranked <strong>{totalRanked.toLocaleString()}</strong> candidates across all signals
              </p>
            </div>
          )}

          {/* Controls row */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800"
            >
              {expandAll ? '▲ Collapse All Breakdowns' : '▼ Expand All Breakdowns'}
            </button>
            <button
              onClick={downloadCSV}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              📥 Download CSV (with signal scores)
            </button>
          </div>

          {/* Candidate cards */}
          <div className="space-y-4">
            {results.map((r, i) => (
              <CandidateCard
                key={i}
                r={r}
                rank={r.rank || i + 1}
                expanded={!!expandedCards[i]}
                onToggle={() => toggleCard(i)}
              />
            ))}

            {results.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">🔍</div>
                <p>No matching candidates found for this job description.</p>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => { setStep(1); setJd(''); setResults([]); setDatasetOption('') }}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 py-3 rounded-xl font-medium transition-all"
            >
              🔄 New Search
            </button>
            <button
              onClick={() => navigate('/recruiter/dashboard')}
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl font-bold transition-all"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-mesh transition-all duration-300">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/10 dark:border-indigo-500/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 md:px-8 py-4">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all group-hover:scale-105">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Skill<span className="gradient-text">Sync</span>
            </span>
          </div>

          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {['Job Description', 'Dataset', 'Results'].map((label, i) => {
              const s = i + 1
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20'
                        : step > s
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                    }`}
                  >
                    {step > s ? '✓' : s}
                  </div>
                  <span className={`text-xs font-medium hidden md:block ${step === s ? 'text-indigo-500' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  {s < 3 && <span className="text-gray-300 dark:text-gray-600">›</span>}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark(!dark)}
              className="p-2.5 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-lg transition-all border border-gray-200/50 dark:border-white/5"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => navigate('/recruiter/dashboard')}
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-500 text-sm font-semibold transition-colors"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  )
}