import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function RankCandidates() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(true)
  const [step, setStep] = useState(1)
  const [jd, setJd] = useState('')
  const [datasetOption, setDatasetOption] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const handleRank = async () => {
    if (!jd.trim()) return alert('Please enter a job description!')
    setLoading(true)
    setStep(3)
    setTimeout(() => {
      setResults([
        { rank: 1, name: 'Ravi Kumar', score: 94, skills: ['Python', 'ML', 'Flask'], experience: '3 years', match: 'Strong match — all required skills verified' },
        { rank: 2, name: 'Priya S', score: 87, skills: ['Python', 'ML', 'Django'], experience: '2 years', match: 'Good match — most skills verified' },
        { rank: 3, name: 'Arjun M', score: 76, skills: ['Python', 'Flask'], experience: '1 year', match: 'Partial match — some skills missing' },
        { rank: 4, name: 'Sneha R', score: 68, skills: ['Python', 'SQL'], experience: '2 years', match: 'Moderate match — different specialization' },
        { rank: 5, name: 'Karthik L', score: 61, skills: ['Java', 'Spring'], experience: '3 years', match: 'Weak match — different tech stack' },
      ])
      setLoading(false)
    }, 3000)
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
            <p className="text-gray-500 dark:text-gray-400 mb-8">Paste your job description and let AI find the best candidates</p>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Job Description</label>
              <textarea
                placeholder="e.g. We are looking for a Python Developer with 2+ years of experience in Machine Learning, Flask, and REST APIs. The candidate should have strong knowledge of scikit-learn and pandas..."
                value={jd} rows={8}
                onChange={e => setJd(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none text-sm" />
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

            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setDatasetOption('live')}
                className={`border-2 rounded-2xl p-6 text-left transition-all ${datasetOption === 'live' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-teal-500'}`}>
                <div className="text-3xl mb-3">👥</div>
                <div className="font-bold text-gray-900 dark:text-white mb-1">Live SkillSync Database</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Use verified candidates already registered on SkillSync</div>
              </button>
              <button
                onClick={() => setDatasetOption('upload')}
                className={`border-2 rounded-2xl p-6 text-left transition-all ${datasetOption === 'upload' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-teal-500'}`}>
                <div className="text-3xl mb-3">📁</div>
                <div className="font-bold text-gray-900 dark:text-white mb-1">Upload Your CSV</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Upload your own candidate dataset in CSV format</div>
              </button>
            </div>

            {datasetOption === 'upload' && (
              <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center mb-6">
                <div className="text-4xl mb-3">📤</div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Upload your candidates CSV file</p>
                <input type="file" accept=".csv"
                  onChange={e => setFile(e.target.files[0])}
                  className="hidden" id="csvUpload" />
                <label htmlFor="csvUpload"
                  className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium cursor-pointer transition-all">
                  Choose File
                </label>
                {file && <p className="text-teal-500 mt-3 text-sm font-medium">✅ {file.name} selected</p>}
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => setStep(1)}
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
            <p className="text-gray-500 dark:text-gray-400 mb-8">Candidates ranked by AI based on your job description</p>

            {loading ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4 animate-pulse">🧠</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI is analyzing candidates...</h2>
                <p className="text-gray-500 dark:text-gray-400">Reading JD → Matching profiles → Calculating scores</p>
              </div>
            ) : (
              <div>
                {/* Download Button */}
                <div className="flex justify-end mb-4">
                  <button className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-all">
                    📥 Download CSV
                  </button>
                </div>

                {/* Results Table */}
                <div className="space-y-4">
                  {results.map((r, i) => (
                    <div key={i} className={`bg-gray-50 dark:bg-gray-900 border rounded-2xl p-6 transition-all hover:border-teal-500 ${i === 0 ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/10' : 'border-gray-100 dark:border-gray-800'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-teal-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-purple-500' : 'bg-gray-400'}`}>
                            #{r.rank}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">{r.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{r.experience}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${r.score >= 90 ? 'text-teal-500' : r.score >= 75 ? 'text-blue-500' : r.score >= 60 ? 'text-yellow-500' : 'text-red-400'}`}>
                            {r.score}%
                          </div>
                          <div className="text-xs text-gray-400">Match Score</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {r.skills.map((s, j) => (
                          <span key={j} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs font-medium">
                            {s}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">💡 {r.match}</p>

                      {/* Score Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${r.score >= 90 ? 'bg-teal-500' : r.score >= 75 ? 'bg-blue-500' : r.score >= 60 ? 'bg-yellow-500' : 'bg-red-400'}`}
                          style={{width: `${r.score}%`}}>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 mt-8">
                  <button onClick={() => { setStep(1); setJd(''); setResults([]); setDatasetOption('') }}
                    className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 py-3 rounded-xl font-medium transition-all">
                    🔄 New Search
                  </button>
                  <button onClick={() => navigate('/recruiter/dashboard')}
                    className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl font-semibold transition-all">
                    ← Back to Dashboard
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