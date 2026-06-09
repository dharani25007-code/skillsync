import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

export default function BrowseJobs() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(true)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    document.documentElement.classList.toggle('dark', dark)
    loadJobs()
  }, [dark])

  const loadJobs = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/jobs/list`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setJobs(res.data || [])
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        navigate('/login')
      } else {
        setError('Failed to load jobs. Please try again.')
      }
    }
    setLoading(false)
  }

  const filteredJobs = jobs.filter(job => {
    const matchSearch = !search ||
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.company?.toLowerCase().includes(search.toLowerCase()) ||
      (job.required_skills || []).some(s => s.toLowerCase().includes(search.toLowerCase()))
    const matchFilter = filter === 'all' ||
      job.work_mode?.toLowerCase() === filter
    return matchSearch && matchFilter
  })

  const modeColor = (mode) => {
    const m = (mode || '').toLowerCase()
    if (m === 'remote') return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
    if (m === 'hybrid') return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  }

  const matchColor = (score) => {
    if (score >= 0.8) return 'text-teal-500'
    if (score >= 0.5) return 'text-blue-500'
    if (score >= 0.3) return 'text-yellow-500'
    return 'text-gray-400'
  }

  const matchLabel = (score) => {
    if (score >= 0.8) return '🔥 Great Match'
    if (score >= 0.5) return '✅ Good Match'
    if (score >= 0.3) return '⚡ Partial Match'
    return '📋 Low Match'
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
          <button onClick={() => navigate('/jobseeker/dashboard')}
            className="text-gray-500 dark:text-gray-400 hover:text-teal-500 text-sm font-medium">
            ← Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Browse Jobs</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Jobs ranked by how well they match your verified skills
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex gap-3 mb-4">
          <input
            placeholder="Search by title, company or skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500">
            <option value="all">All Modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {loading ? 'Loading...' : `${filteredJobs.length} jobs found — sorted by match score`}
        </p>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3 animate-pulse">💼</div>
            <p className="text-gray-500 dark:text-gray-400">Loading jobs matched to your profile...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job, i) => (
              <div key={i}
                className={`bg-gray-50 dark:bg-gray-900 border rounded-2xl p-6 transition-all hover:border-teal-500 ${
                  job.match_score >= 0.8 ? 'border-teal-300 dark:border-teal-800' : 'border-gray-100 dark:border-gray-800'
                }`}>

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h3>
                      {job.source === 'featured' && (
                        <span className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-teal-500 font-semibold">{job.company}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-lg font-bold ${matchColor(job.match_score)}`}>
                      {Math.round((job.match_score || 0) * 100)}%
                    </div>
                    <div className="text-xs text-gray-400">{matchLabel(job.match_score)}</div>
                  </div>
                </div>

                {/* Match bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mb-4">
                  <div
                    className={`h-1 rounded-full transition-all ${
                      job.match_score >= 0.8 ? 'bg-teal-500' :
                      job.match_score >= 0.5 ? 'bg-blue-500' :
                      job.match_score >= 0.3 ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${(job.match_score || 0) * 100}%` }} />
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                  {job.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(job.required_skills || []).map((s, j) => (
                    <span key={j}
                      className="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-2 py-1 rounded-full text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                    <span>📍 {job.location}</span>
                    <span>💼 {job.experience_min}-{job.experience_max} yrs</span>
                    {job.salary_min > 0 && (
                      <span>💰 ₹{job.salary_min}L-{job.salary_max}L</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${modeColor(job.work_mode)}`}>
                      {job.work_mode}
                    </span>
                    <span>🕒 {job.posted_days_ago}d ago</span>
                  </div>
                  <button
                    onClick={() => window.open('https://redrob.io', '_blank')}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all">
                    Apply Now →
                  </button>
                </div>
              </div>
            ))}

            {filteredJobs.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">No jobs found matching your search.</p>
                <button onClick={() => { setSearch(''); setFilter('all') }}
                  className="text-teal-500 hover:underline text-sm">Clear filters</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}