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
  const [selectedJob, setSelectedJob] = useState(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [applyError, setApplyError] = useState('')

  const handleApplySubmit = async (e) => {
    e.preventDefault()
    if (!uploadFile) {
      setApplyError('Please upload a resume or document.')
      return
    }
    setSubmitting(true)
    setApplyError('')
    setSuccessMsg('')
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', uploadFile)
      if (coverLetter) {
        formData.append('cover_letter', coverLetter)
      }

      await axios.post(`${API}/jobs/apply/${selectedJob.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      setSuccessMsg('Your application has been submitted successfully!')
      setCoverLetter('')
      setUploadFile(null)
      
      // Update local state to reflect that the user applied to this job
      setJobs(prevJobs => prevJobs.map(j => 
        j.id === selectedJob.id ? { ...j, applied: true } : j
      ))

      setTimeout(() => {
        setSelectedJob(null)
        setSuccessMsg('')
      }, 2000)
    } catch (err) {
      setApplyError(err.response?.data?.detail || 'Failed to submit application. Please try again.')
    }
    setSubmitting(false)
  }

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
                  {job.applied ? (
                    <button
                      disabled
                      className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-5 py-2 rounded-lg text-sm font-bold cursor-default"
                    >
                      ✓ Applied
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedJob(job)
                        setCoverLetter('')
                        setUploadFile(null)
                        setSuccessMsg('')
                        setApplyError('')
                      }}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                    >
                      Apply Now →
                    </button>
                  )}
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

      {/* Apply Job Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-xl w-full p-6 relative max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-800 shadow-2xl">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-4 right-4 text-gray-450 hover:text-gray-800 dark:hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Apply for {selectedJob.title}</h2>
            <p className="text-teal-500 font-semibold mb-4">{selectedJob.company || 'Recruiter Company'}</p>

            <div className="space-y-4 mb-6 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl text-sm border border-gray-100 dark:border-gray-800">
              <div>
                <span className="text-gray-405 font-medium block">Job Description</span>
                <p className="text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">{selectedJob.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-405 font-medium block">Location</span>
                  <span className="text-gray-705 dark:text-gray-300">{selectedJob.location}</span>
                </div>
                <div>
                  <span className="text-gray-405 font-medium block">Experience Required</span>
                  <span className="text-gray-705 dark:text-gray-300">{selectedJob.experience_min}-{selectedJob.experience_max} years</span>
                </div>
                <div>
                  <span className="text-gray-405 font-medium block">Salary Range</span>
                  <span className="text-gray-705 dark:text-gray-300">{selectedJob.salary_min > 0 ? `₹${selectedJob.salary_min}L - ₹${selectedJob.salary_max}L` : 'Not Specified'}</span>
                </div>
                <div>
                  <span className="text-gray-405 font-medium block">Work Mode</span>
                  <span className="text-gray-705 dark:text-gray-300 capitalize">{selectedJob.work_mode}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-405 font-medium block mb-1">Required Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedJob.required_skills || []).map((s, idx) => (
                    <span key={idx} className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {applyError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-650 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
                ⚠️ {applyError}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-650 dark:text-emerald-400 px-4 py-3 rounded-xl mb-4 text-sm font-semibold">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-705 dark:text-gray-300 mb-1">
                  Upload Resume / Documents * (PDF, DOC, DOCX)
                </label>
                <input
                  required
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600 file:cursor-pointer border border-gray-200 dark:border-gray-750 rounded-xl p-2 bg-transparent"
                />
                {uploadFile && (
                  <p className="text-xs text-teal-500 font-medium mt-1">✓ {uploadFile.name} selected</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-755 dark:text-gray-300 mb-1">
                  Cover Letter / Notes (Optional)
                </label>
                <textarea
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell the recruiter why you're a good fit..."
                  className="w-full border border-gray-200 dark:border-gray-750 rounded-xl px-4 py-3 bg-transparent text-gray-900 dark:text-white resize-none text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 py-3 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20"
                >
                  {submitting ? 'Submitting...' : 'Submit Application →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}