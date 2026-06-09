import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API = 'http://127.0.0.1:8000'

export default function RankCandidates() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(true)
  const [step, setStep] = useState(1)
  const [jd, setJd] = useState('')
  const [datasetOption, setDatasetOption] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [totalRanked, setTotalRanked] = useState(0)
  const [jdRequirements, setJdRequirements] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const handleRank = async () => {
    if (!jd.trim()) return
    setLoading(true)
    setError('')
    setStep(3)

    try {
      const token = localStorage.getItem('token')
      const source = datasetOption === 'upload' ? 'skillsync' : datasetOption
      const res = await axios.post(`${API}/ranking/rank`, {
        jd_text: jd,
        dataset_source: source,
        top_n: 20
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

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
    const headers = ['rank', 'candidate_id', 'name', 'title', 'score', 'reasoning']
    const rows = results.map(r => [
      r.rank, r.candidate_id, r.name || '', r.current_title || '', r.score, r.reasoning
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'skillsync_ranked_candidates.csv'
    a.click()
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-all duration-300">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">SkillSync</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setDark(!dark)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-lg">
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={() => navigate('/recruiter/dashboard')}
            className="text-gray-500 dark:text-gray-400 hover:text-teal-500 text-sm font-medium">
            ← Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Step 1 — Job Description */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Candidate Ranking</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Paste your job description and let AI find the best candidates
            </p>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Job Description *
              </label>
              <textarea
                placeholder="e.g. We are looking for a Senior ML Engineer with 5+ years of experience in Python, machine learning, NLP, embeddings, and vector databases. The candidate should have experience building production-grade AI systems..."
                value={jd} rows={10}
                onChange={e => setJd(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none text-sm" />

              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="text-xs text-gray-400">Quick fill:</span>
                {[
                  'Python Developer with ML experience',
                  'Full Stack React + Node.js Developer',
                  'Data Scientist with NLP expertise',
                  'Senior AI Engineer with LLM experience'
                ].map(t => (
                  <button key={t} onClick={() => setJd(`We are looking for a ${t}. Required skills include relevant technologies and 3+ years of experience.`)}
                    className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-gray-600 dark:text-gray-400 hover:text-teal-500 px-2 py-1 rounded-lg transition-all">
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!jd.trim()}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition-all">
              Next — Choose Dataset →
            </button>
          </div>
        )}

        {/* Step 2 — Dataset */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Choose Candidate Dataset</h1>
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
                  desc: 'Use verified candidates who registered on SkillSync — with AI exam scores',
                  badge: '✅ Verified Skills'
                },
                {
                  id: 'hackathon',
                  icon: '📊',
                  title: 'INDIA RUNS Dataset',
                  desc: 'Use the 100K candidate dataset provided by Redrob for the hackathon',
                  badge: '100K Candidates'
                },
                {
                  id: 'upload',
                  icon: '📁',
                  title: 'Upload Your Own CSV',
                  desc: 'Upload your own candidate dataset in CSV format',
                  badge: 'Custom Data'
                },
              ].map(opt => (
                <button key={opt.id} onClick={() => setDatasetOption(opt.id)}
                  className={`border-2 rounded-2xl p-5 text-left transition-all ${datasetOption === opt.id ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">{opt.title}</div>
                      <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">{opt.badge}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-9">{opt.desc}</p>
                </button>
              ))}
            </div>

            {datasetOption === 'upload' && (
              <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center mb-6">
                <div className="text-4xl mb-3">📤</div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Upload your candidates CSV file</p>
                <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])}
                  className="hidden" id="csvUpload" />
                <label htmlFor="csvUpload"
                  className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium cursor-pointer transition-all">
                  Choose File
                </label>
                {file && <p className="text-teal-500 mt-3 text-sm font-medium">✅ {file.name} selected</p>}
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => { setStep(1); setError('') }}
                className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 rounded-xl font-medium transition-all">
                ← Back
              </button>
              <button onClick={handleRank}
                disabled={!datasetOption || (datasetOption === 'upload' && !file)}
                className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all">
                🚀 Rank Candidates with AI
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Results */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Ranking Results</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Candidates ranked by AI based on your job description
            </p>

            {loading ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4 animate-pulse">🧠</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  AI is analyzing candidates...
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Reading JD → Matching profiles → Calculating scores
                </p>
              </div>
            ) : (
              <div>
                {/* Stats */}
                {jdRequirements && (
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">📋 JD Analysis</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                        Exp: {jdRequirements.min_exp}-{jdRequirements.max_exp} years
                      </span>
                      {jdRequirements.required_skills?.slice(0, 6).map(s => (
                        <span key={s} className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-2 py-1 rounded-full capitalize">{s}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Ranked {totalRanked.toLocaleString()} candidates</p>
                  </div>
                )}

                {/* Download */}
                <div className="flex justify-end mb-4">
                  <button onClick={downloadCSV}
                    className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-all">
                    📥 Download CSV
                  </button>
                </div>

                {/* Results */}
                <div className="space-y-4">
                  {results.map((r, i) => (
                    <div key={i}
                      className={`bg-gray-50 dark:bg-gray-900 border rounded-2xl p-6 transition-all hover:border-teal-500 ${i === 0 ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/10' : 'border-gray-100 dark:border-gray-800'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${i === 0 ? 'bg-teal-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-purple-500' : 'bg-gray-400'}`}>
                            #{r.rank}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {r.name || r.candidate_id}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {r.current_title || 'Professional'} • {r.location || 'Location N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${r.score >= 0.8 ? 'text-teal-500' : r.score >= 0.6 ? 'text-blue-500' : r.score >= 0.4 ? 'text-yellow-500' : 'text-red-400'}`}>
                            {Math.round(r.score * 100)}%
                          </div>
                          <div className="text-xs text-gray-400">Match Score</div>
                        </div>
                      </div>

                      {/* Skills */}
                      {r.skills && r.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {r.skills.slice(0, 5).map((s, j) => (
                            <span key={j}
                              className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs font-medium">
                              {typeof s === 'object' ? s.name : s}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        💡 {r.reasoning}
                      </p>

                      {/* Score Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${r.score >= 0.8 ? 'bg-teal-500' : r.score >= 0.6 ? 'bg-blue-500' : r.score >= 0.4 ? 'bg-yellow-500' : 'bg-red-400'}`}
                          style={{ width: `${r.score * 100}%` }}>
                        </div>
                      </div>
                    </div>
                  ))}

                  {results.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-3">🔍</div>
                      <p>No candidates found. Try a different dataset or JD.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-8">
                  <button onClick={() => { setStep(1); setJd(''); setResults([]); setDatasetOption('') }}
                    className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 py-3 rounded-xl font-medium transition-all">
                    🔄 New Search
                  </button>
                  <button onClick={() => navigate('/recruiter/dashboard')}
                    className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl font-semibold transition-all">
                    ← Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}