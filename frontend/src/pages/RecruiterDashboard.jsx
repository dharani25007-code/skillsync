import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Recruiter'
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const [history, setHistory] = useState([])
  const [showJobModal, setShowJobModal] = useState(false)
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    required_skills: '',
    experience_min: '',
    experience_max: '',
    location: '',
    work_mode: 'flexible',
    salary_min: '',
    salary_max: '',
    industry: ''
  })
  const [myJobs, setMyJobs] = useState([])
  const [selectedApplicants, setSelectedApplicants] = useState([])
  const [showApplicantsModal, setShowApplicantsModal] = useState(false)
  const [applicantsJobTitle, setApplicantsJobTitle] = useState('')
  const [loadingApplicants, setLoadingApplicants] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingJob, setEditingJob] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    loadHistory()
    loadMyJobs()
  }, [dark])

  const loadMyJobs = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/jobs/my-posts`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMyJobs(res.data || [])
    } catch (err) { }
  }

  const handleViewApplicants = async (jobId, jobTitle) => {
    setLoadingApplicants(true)
    setApplicantsJobTitle(jobTitle)
    setShowApplicantsModal(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/jobs/applicants/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSelectedApplicants(res.data || [])
    } catch (err) {
      alert('Failed to load applicants')
    }
    setLoadingApplicants(false)
  }

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/ranking/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHistory(res.data || [])
    } catch (err) { }
  }

  const handlePostJob = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const skillsArray = newJob.required_skills.split(',').map(s => s.trim()).filter(Boolean)
      await axios.post(`${API}/jobs/post`, {
        title: newJob.title,
        description: newJob.description,
        required_skills: skillsArray,
        experience_min: newJob.experience_min ? parseFloat(newJob.experience_min) : 0,
        experience_max: newJob.experience_max ? parseFloat(newJob.experience_max) : 20,
        location: newJob.location || 'India',
        work_mode: newJob.work_mode || 'flexible',
        salary_min: newJob.salary_min ? parseFloat(newJob.salary_min) : 0,
        salary_max: newJob.salary_max ? parseFloat(newJob.salary_max) : 0,
        industry: newJob.industry || 'Technology'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('Job posted successfully!')
      setShowJobModal(false)
      setNewJob({
        title: '',
        description: '',
        required_skills: '',
        experience_min: '',
        experience_max: '',
        location: '',
        work_mode: 'flexible',
        salary_min: '',
        salary_max: '',
        industry: ''
      })
      loadMyJobs()
    } catch (err) {
      alert('Failed to post job')
    }
  }

  const handleEditJobSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const skillsArray = typeof editingJob.required_skills === 'string'
        ? editingJob.required_skills.split(',').map(s => s.trim()).filter(Boolean)
        : editingJob.required_skills
        
      await axios.put(`${API}/jobs/edit/${editingJob.id}`, {
        title: editingJob.title,
        description: editingJob.description,
        required_skills: skillsArray,
        experience_min: editingJob.experience_min ? parseFloat(editingJob.experience_min) : 0,
        experience_max: editingJob.experience_max ? parseFloat(editingJob.experience_max) : 20,
        location: editingJob.location || 'India',
        work_mode: editingJob.work_mode || 'flexible',
        salary_min: editingJob.salary_min ? parseFloat(editingJob.salary_min) : 0,
        salary_max: editingJob.salary_max ? parseFloat(editingJob.salary_max) : 0,
        industry: editingJob.industry || 'Technology'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('Job post updated successfully!')
      setShowEditModal(false)
      setEditingJob(null)
      loadMyJobs()
    } catch (err) {
      alert('Failed to update job post')
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job posting? All candidate applications for this job will be permanently deleted.")) {
      return
    }
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API}/jobs/delete/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('Job post deleted successfully!')
      loadMyJobs()
    } catch (err) {
      alert('Failed to delete job post')
    }
  }

  const handleSendQueryReply = async (applicationId, message) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API}/jobs/applications/${applicationId}/query`, { message }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSelectedApplicants(prevApps => prevApps.map(app => 
        app.application_id === applicationId ? { ...app, queries: res.data.queries } : app
      ))
    } catch (err) {
      alert('Failed to send reply')
    }
  }

  const handleDownloadResume = async (applicationId, filename) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/jobs/download-resume/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename || 'resume.pdf')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download resume. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-mesh transition-all duration-300">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/10 dark:border-indigo-500/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 md:px-8 py-4">
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
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20">
              {name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">

        <div className="mb-10 slide-up">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">
            Welcome, {name}! 🏢
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Find the perfect candidates for your job openings
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-6 mb-10 slide-up slide-up-delay-1">
          {[
            { number: history.length, label: 'Ranking Sessions', icon: '📊', gradient: 'from-indigo-500 to-violet-500' },
            { number: history.reduce((acc, h) => acc + (h.results?.length || 0), 0), label: 'Candidates Ranked', icon: '👥', gradient: 'from-teal-500 to-emerald-500' },
            { number: '100K+', label: 'Dataset Size', icon: '🗄️', gradient: 'from-amber-500 to-orange-500' },
          ].map((s, i) => (
            <div key={i} className="card p-5 md:p-6 text-center glow-hover">
              <div className="text-2xl md:text-3xl mb-2">{s.icon}</div>
              <div className={`text-2xl md:text-3xl font-black bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent mb-1`}>{s.number}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-5 mb-10 slide-up slide-up-delay-2">
          {[
            {
              icon: '🎯',
              title: 'Rank Candidates with AI',
              desc: 'Post a job description and let our AI rank the best candidates instantly from 100K+ profiles',
              action: 'Start Ranking',
              gradient: 'from-indigo-500 to-violet-500',
              link: '/recruiter/rank'
            },
            {
              icon: '📊',
              title: 'Use INDIA RUNS Dataset',
              desc: 'Rank candidates from the official 100K Redrob hackathon dataset',
              action: 'Use Dataset',
              gradient: 'from-teal-500 to-emerald-500',
              link: '/recruiter/rank'
            },
            {
              icon: '📁',
              title: 'Upload Your Own Dataset',
              desc: 'Upload your own CSV candidate dataset and rank with AI',
              action: 'Upload CSV',
              gradient: 'from-violet-500 to-purple-500',
              link: '/recruiter/rank'
            },
            {
              icon: '📝',
              title: 'Post a Job',
              desc: 'Create a new job posting for candidates to discover and apply',
              action: 'Post Job',
              gradient: 'from-amber-500 to-orange-500',
              onClick: () => setShowJobModal(true)
            },
          ].map((card, i) => (
            <div key={i}
              className="card p-6 glow-hover group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform inline-block">{card.icon}</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{card.desc}</p>
              <button
                onClick={() => card.onClick ? card.onClick() : (card.link && navigate(card.link))}
                className={`text-sm font-semibold px-5 py-2.5 rounded-xl transition-all text-white bg-gradient-to-r ${card.gradient} shadow-md hover:shadow-lg hover:scale-[1.02] cursor-pointer`}>
                {card.action} →
              </button>
            </div>
          ))}
        </div>

        {/* Active Job Postings */}
        <div className="card p-6 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><span className="text-lg">💼</span> Your Active Job Postings</h3>
          {myJobs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No jobs posted yet. Click "Post a Job" to start!</p>
          ) : (
            <div className="space-y-3">
              {myJobs.map((job) => (
                <div key={job.id}
                  className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{job.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      📍 {job.location || 'Flexible'} · 💼 {job.experience_min || 0}–{job.experience_max || 20} yrs · {job.required_skills?.length || 0} skills
                      {(job.salary_min > 0 || job.salary_max > 0) && ` · 💰 ₹${job.salary_min || 0}L–₹${job.salary_max || 0}L`}
                      {job.work_mode && ` · ${job.work_mode}`}
                      {job.industry && ` · ${job.industry}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewApplicants(job.id, job.title)}
                      className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all cursor-pointer">
                      Applicants
                    </button>
                    <button
                      onClick={() => {
                        setEditingJob({
                          ...job,
                          required_skills: (job.required_skills || []).join(', ')
                        })
                        setShowEditModal(true)
                      }}
                      className="text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-800/50 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all cursor-pointer">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg border border-red-200/50 dark:border-red-800/50 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Rankings */}
        {history.length > 0 && (
          <div className="card p-6 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><span className="text-lg">📋</span> Recent Ranking Sessions</h3>
            <div className="space-y-3">
              {history.slice(0, 5).map((h, i) => (
                <div key={i}
                  className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {h.jd_text?.slice(0, 60)}...
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {h.dataset_source} • {h.results?.length} candidates ranked
                    </p>
                  </div>
                  <span className="text-xs text-teal-500 font-medium">
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => { localStorage.clear(); navigate('/') }}
          className="text-gray-400 hover:text-red-500 text-sm transition-all font-medium">
          ← Logout
        </button>
      </div>

      {/* Post Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-xl w-full p-6 relative max-h-[95vh] overflow-y-auto border border-gray-150 dark:border-gray-800 shadow-2xl">
            <button onClick={() => setShowJobModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white text-lg font-bold">✕</button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Post a New Job</h2>
            <form onSubmit={handlePostJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                <input required type="text" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} placeholder="e.g. Senior Backend Developer"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Required Skills (comma separated)</label>
                <input type="text" value={newJob.required_skills} onChange={e => setNewJob({...newJob, required_skills: e.target.value})} placeholder="e.g. React, Node.js, Python"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <input type="text" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} placeholder="e.g. Bangalore, Remote"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Mode</label>
                  <select value={newJob.work_mode} onChange={e => setNewJob({...newJob, work_mode: e.target.value})}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Experience (years)</label>
                  <input type="number" step="0.5" value={newJob.experience_min} onChange={e => setNewJob({...newJob, experience_min: e.target.value})} placeholder="0"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Experience (years)</label>
                  <input type="number" step="0.5" value={newJob.experience_max} onChange={e => setNewJob({...newJob, experience_max: e.target.value})} placeholder="20"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Salary (LPA)</label>
                  <input type="number" step="0.5" value={newJob.salary_min} onChange={e => setNewJob({...newJob, salary_min: e.target.value})} placeholder="e.g. 10"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Salary (LPA)</label>
                  <input type="number" step="0.5" value={newJob.salary_max} onChange={e => setNewJob({...newJob, salary_max: e.target.value})} placeholder="e.g. 20"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                <input type="text" value={newJob.industry} onChange={e => setNewJob({...newJob, industry: e.target.value})} placeholder="e.g. AI / Technology"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea required rows={4} value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} placeholder="Job description, expectations, and role details..."
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white resize-none" />
              </div>
              <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-teal-500/20">
                Publish Job
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showEditModal && editingJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-xl w-full p-6 relative max-h-[95vh] overflow-y-auto border border-gray-150 dark:border-gray-800 shadow-2xl">
            <button onClick={() => { setShowEditModal(false); setEditingJob(null); }} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white text-lg font-bold">✕</button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Edit Job Posting</h2>
            <form onSubmit={handleEditJobSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                <input required type="text" value={editingJob.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Required Skills (comma separated)</label>
                <input type="text" value={editingJob.required_skills} onChange={e => setEditingJob({...editingJob, required_skills: e.target.value})}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <input type="text" value={editingJob.location} onChange={e => setEditingJob({...editingJob, location: e.target.value})}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Mode</label>
                  <select value={editingJob.work_mode} onChange={e => setEditingJob({...editingJob, work_mode: e.target.value})}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Experience (years)</label>
                  <input type="number" step="0.5" value={editingJob.experience_min} onChange={e => setEditingJob({...editingJob, experience_min: e.target.value})}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Experience (years)</label>
                  <input type="number" step="0.5" value={editingJob.experience_max} onChange={e => setEditingJob({...editingJob, experience_max: e.target.value})}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Salary (LPA)</label>
                  <input type="number" step="0.5" value={editingJob.salary_min} onChange={e => setEditingJob({...editingJob, salary_min: e.target.value})}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Salary (LPA)</label>
                  <input type="number" step="0.5" value={editingJob.salary_max} onChange={e => setEditingJob({...editingJob, salary_max: e.target.value})}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                <input type="text" value={editingJob.industry} onChange={e => setEditingJob({...editingJob, industry: e.target.value})}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea required rows={4} value={editingJob.description} onChange={e => setEditingJob({...editingJob, description: e.target.value})}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-transparent text-gray-900 dark:text-white resize-none" />
              </div>
              <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-teal-500/20">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Applicants Modal */}
      {showApplicantsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-800 shadow-2xl">
            <button
              onClick={() => {
                setShowApplicantsModal(false)
                setSelectedApplicants([])
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Applicants</h2>
            <p className="text-teal-500 font-semibold mb-6">Job: {applicantsJobTitle}</p>

            {loadingApplicants ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2 animate-bounce">⏳</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading applicant profiles...</p>
              </div>
            ) : selectedApplicants.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">👥</div>
                <p>No candidates applied yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedApplicants.map((app) => (
                  <div
                    key={app.application_id}
                    className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-150 dark:border-gray-700/60"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">{app.name}</h4>
                        <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">{app.email}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        Applied on {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {app.headline && (
                      <p className="text-xs text-gray-650 dark:text-gray-300 font-medium mb-2 bg-white dark:bg-gray-850 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                        {app.headline} · {app.years_of_experience} yrs exp
                      </p>
                    )}

                    {app.cover_letter && (
                      <div className="mb-3">
                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5">Cover Letter:</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-850 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 leading-relaxed italic">
                          "{app.cover_letter}"
                        </p>
                      </div>
                    )}

                    {app.resume_filename && (
                      <div className="flex items-center justify-between bg-teal-50/50 dark:bg-teal-950/10 p-2.5 rounded-xl border border-teal-100/50 dark:border-teal-900/20 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📄</span>
                          <span className="text-xs font-semibold text-gray-750 dark:text-gray-300 truncate max-w-[200px]">
                            {app.resume_filename}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownloadResume(app.application_id, app.resume_filename)}
                          className="text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Download Resume
                        </button>
                      </div>
                    )}

                    {/* Queries Chat Thread */}
                    <div className="mt-4 border-t border-gray-200 dark:border-gray-770 pt-4">
                      <span className="text-[10px] text-gray-400 font-bold block mb-2 tracking-wider uppercase">Conversation Thread</span>
                      <div className="space-y-3 max-h-48 overflow-y-auto mb-3 bg-gray-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-gray-100 dark:border-white/5 scroll-smooth">
                        {(app.queries && app.queries.length > 0) ? (
                          app.queries.map((q, idx) => (
                            <div key={idx} className={`flex flex-col ${q.sender === 'recruiter' ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-sm ${q.sender === 'recruiter' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-none shadow-indigo-500/10' : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-white/5'}`}>
                                <span className="font-bold text-[9px] block mb-1 opacity-70 tracking-wider uppercase">{q.sender === 'recruiter' ? 'You' : app.name}</span>
                                <p className="leading-relaxed font-medium">{q.message}</p>
                                <span className="text-[8px] opacity-60 block mt-1 text-right">
                                  {new Date(q.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 italic text-center py-4">No conversation started yet.</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Reply to candidate..."
                          id={`reply-input-${app.application_id}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              handleSendQueryReply(app.application_id, e.target.value.trim());
                              e.target.value = '';
                            }
                          }}
                          className="flex-1 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 bg-white dark:bg-white/5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById(`reply-input-${app.application_id}`);
                             if (input && input.value.trim()) {
                               handleSendQueryReply(app.application_id, input.value.trim());
                               input.value = '';
                             }
                          }}
                          className="btn-primary text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}