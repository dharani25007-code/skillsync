import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function BrowseJobs() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
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
  const [isDragging, setIsDragging] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const ext = file.name.split('.').pop().toLowerCase()
      if (['pdf', 'doc', 'docx'].includes(ext)) {
        setUploadFile(file)
      } else {
        setApplyError('Unsupported file format. Please upload PDF, DOC, or DOCX.')
      }
    }
  }

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
    localStorage.setItem('theme', dark ? 'dark' : 'light')
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
    if (score >= 0.8) return 'text-indigo-500'
    if (score >= 0.5) return 'text-teal-500'
    if (score >= 0.3) return 'text-amber-500'
    return 'text-gray-400'
  }

  const matchLabel = (score) => {
    if (score >= 0.8) return '🔥 Great Match'
    if (score >= 0.5) return '✅ Good Match'
    if (score >= 0.3) return '⚡ Partial Match'
    return '📋 Low Match'
  }

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
          <div className="flex items-center gap-3">
            <button onClick={() => setDark(!dark)}
              className="p-2.5 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-lg transition-all border border-gray-200/50 dark:border-white/5">
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => navigate('/jobseeker/dashboard')}
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-500 text-sm font-semibold transition-colors">
              ← Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="mb-8 slide-up">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">Browse Jobs</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Jobs ranked by how well they match your verified skills
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex gap-3 mb-4 slide-up slide-up-delay-1">
          <input
            placeholder="Search by title, company or skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3 rounded-xl transition-all" />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3 rounded-xl">
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
                className={`card p-6 glow-hover ${
                  job.match_score >= 0.8 ? 'border-indigo-300 dark:border-indigo-800/50' : ''
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
                    <p className="text-indigo-500 font-semibold">{job.company}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-lg font-bold ${matchColor(job.match_score)}`}>
                      {Math.round((job.match_score || 0) * 100)}%
                    </div>
                    <div className="text-xs text-gray-400">{matchLabel(job.match_score)}</div>
                  </div>
                </div>

                {/* Match bar */}
                <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-1.5 mb-4">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      job.match_score >= 0.8 ? 'bg-gradient-to-r from-indigo-500 to-violet-500' :
                      job.match_score >= 0.5 ? 'bg-gradient-to-r from-teal-500 to-emerald-500' :
                      job.match_score >= 0.3 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${(job.match_score || 0) * 100}%` }} />
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                  {job.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(job.required_skills || []).map((s, j) => (
                    <span key={j}
                      className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full text-xs font-medium">
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
                      className="btn-primary px-5 py-2 text-sm cursor-pointer">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="card max-w-xl w-full p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-4 right-4 text-gray-450 hover:text-gray-800 dark:hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Apply for {selectedJob.title}</h2>
            <p className="text-indigo-500 font-semibold mb-4">{selectedJob.company || 'Recruiter Company'}</p>

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
                <label className="block text-sm font-medium text-gray-705 dark:text-gray-300 mb-2">
                  Upload Resume / Documents * (PDF, DOC, DOCX)
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10'
                      : uploadFile
                      ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                      : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 bg-transparent'
                  }`}
                  onClick={() => document.getElementById('resume-file-input').click()}
                >
                  <input
                    id="resume-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0])
                      }
                    }}
                    className="hidden"
                    required={!uploadFile}
                  />
                  {uploadFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl text-emerald-500">📄</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[250px]">
                        {uploadFile.name}
                      </span>
                      <span className="text-xs text-gray-405 dark:text-gray-500">
                        {(uploadFile.size / 1024).toFixed(1)} KB · Click to change file
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-3xl text-gray-450 dark:text-gray-400">📤</span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Drag & drop your resume here, or <span className="text-indigo-500 hover:text-indigo-600 transition-colors">browse files</span>
                      </span>
                      <span className="text-xs text-gray-450 dark:text-gray-500">
                        Supports PDF, DOC, DOCX (Max 5MB)
                      </span>
                    </div>
                  )}
                </div>
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
                  className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
