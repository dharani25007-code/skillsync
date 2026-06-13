import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

export default function JobSeekerDashboard() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'User'
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const [profile, setProfile] = useState(null)
  const [completeness, setCompleteness] = useState(20)
  const [applications, setApplications] = useState([])
  const [loadingApps, setLoadingApps] = useState(true)
  const [exams, setExams] = useState([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [selectedApp, setSelectedApp] = useState(null)
  const [showQueryModal, setShowQueryModal] = useState(false)
  const [newQueryMsg, setNewQueryMsg] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    loadProfile()
    loadApplications()
    loadExamHistory()
  }, [dark])

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/profile/jobseeker`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data && Object.keys(res.data).length > 0) {
        setProfile(res.data)
        setCompleteness(res.data.profile_completeness_score || 20)
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        navigate('/login')
      }
    }
  }

  const loadApplications = async () => {
    setLoadingApps(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/jobs/my-applications`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApplications(res.data || [])
    } catch (err) {}
    setLoadingApps(false)
  }

  const loadExamHistory = async () => {
    setLoadingExams(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/exam/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setExams(res.data || [])
    } catch (err) {}
    setLoadingExams(false)
  }

  const examScores = profile?.skill_assessment_scores || {}
  const verifiedSkills = Object.keys(examScores).filter(k => examScores[k] >= 60).length
  const skills = profile?.skills || []

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-mesh transition-all duration-300">

      {/* ── Premium Navbar ───────────────────────────────────── */}
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
            <div
              onClick={() => navigate('/jobseeker/profile')}
              className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 transition-all">
              {name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Welcome ────────────────────────────────────────── */}
        <div className="mb-10 slide-up">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">
            {getGreeting()}, {name}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {profile?.headline || 'Complete your profile to get matched with top jobs'}
          </p>
        </div>

        {/* ── Stats Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8 slide-up slide-up-delay-1">
          {[
            { label: 'Profile Complete', value: `${Math.round(completeness)}%`, icon: '👤', gradient: 'from-indigo-500 to-violet-500' },
            { label: 'Skills Added', value: skills.length, icon: '🛠️', gradient: 'from-teal-500 to-emerald-500' },
            { label: 'Skills Verified', value: verifiedSkills, icon: '✅', gradient: 'from-amber-500 to-orange-500' },
          ].map((stat, i) => (
            <div key={i} className="card p-5 md:p-6 text-center glow-hover">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className={`text-2xl md:text-3xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-1`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Profile Completion Bar ─────────────────────────── */}
        <div className="card p-6 mb-8 slide-up slide-up-delay-2">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-900 dark:text-white text-sm">Profile Completion</span>
            <span className="text-sm font-black bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">{Math.round(completeness)}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 mb-3 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full transition-all duration-700 relative"
              style={{ width: `${completeness}%` }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent shimmer" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {completeness < 50 ? '🚀 Add more details to get better job matches' :
              completeness < 80 ? '💪 Almost there! Complete remaining sections' :
                '🏆 Great profile! You\'re getting better matches now'}
          </p>
        </div>

        {/* ── Action Cards ───────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-5 mb-8 slide-up slide-up-delay-3">
          {[
            {
              icon: '👤', title: 'Complete Profile',
              desc: 'Add skills, experience, education and more',
              action: 'Edit Profile', gradient: 'from-indigo-500 to-violet-500', link: '/jobseeker/profile'
            },
            {
              icon: '🧠', title: 'Take Skill Exam',
              desc: 'Verify skills with AI-generated tests and earn badges',
              action: 'Start Exam', gradient: 'from-violet-500 to-purple-500', link: '/jobseeker/exam'
            },
            {
              icon: '💼', title: 'Browse Jobs',
              desc: 'Find jobs that match your verified skills',
              action: 'Browse Jobs', gradient: 'from-teal-500 to-emerald-500', link: '/jobseeker/jobs'
            },
          ].map((card, i) => (
            <div key={i} className="card p-6 glow-hover group">
              <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} bg-opacity-10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                style={{background: `linear-gradient(135deg, ${card.gradient.includes('indigo') ? 'rgba(99,102,241,0.1)' : card.gradient.includes('violet') ? 'rgba(139,92,246,0.1)' : 'rgba(20,184,166,0.1)'}, ${card.gradient.includes('violet') && !card.gradient.includes('indigo') ? 'rgba(168,85,247,0.1)' : card.gradient.includes('emerald') ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)'})`}}>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{card.desc}</p>
              <button
                onClick={() => card.link && navigate(card.link)}
                className={`text-sm font-semibold px-5 py-2.5 rounded-xl transition-all text-white bg-gradient-to-r ${card.gradient} shadow-md hover:shadow-lg hover:scale-[1.02] cursor-pointer`}>
                {card.action} →
              </button>
            </div>
          ))}
        </div>

        {/* ── Verified Skills ────────────────────────────────── */}
        {Object.keys(examScores).length > 0 && (
          <div className="card p-6 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-lg">🏆</span> Verified Skills
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(examScores).map(([skill, score], i) => (
                <div key={i}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    score >= 60
                      ? 'bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 text-teal-700 dark:text-teal-400 border-teal-200/50 dark:border-teal-800/50'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200/50 dark:border-white/5'}`}>
                  {score >= 60 ? '✅' : '❌'} {skill}
                  <span className="font-bold">{score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Exam History ───────────────────────────────────── */}
        <div className="card p-6 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-lg">🧠</span> Your Exam Attempts
          </h3>
          {loadingExams ? (
            <div className="py-6 flex justify-center">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: `${i*0.15}s`}} />
                ))}
              </div>
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl block mb-2">📝</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">You haven't taken any skill exams yet.</p>
              <button onClick={() => navigate('/jobseeker/exam')} className="text-indigo-500 text-sm font-semibold mt-2 hover:text-indigo-600 transition-colors">Take your first exam →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((attempt) => (
                <div key={attempt.id}
                  className="p-4 bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{attempt.skill_name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Score: <span className="font-bold text-indigo-500">{attempt.score}%</span> ({attempt.correct_answers}/{attempt.total_questions} correct)
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        {new Date(attempt.created_at).toLocaleDateString()} at {new Date(attempt.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                      attempt.passed
                        ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 border border-teal-200/50 dark:border-teal-800/50'
                        : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50'
                    }`}>
                      {attempt.passed ? '✅ Passed' : '❌ Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Profile Summary ────────────────────────────────── */}
        {profile && profile.current_title && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-lg">📋</span> Your Profile Summary
              </h3>
              <button onClick={() => navigate('/jobseeker/profile')}
                className="text-indigo-500 text-sm font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Edit →</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Current Role', value: profile.current_title },
                { label: 'Preferred Role', value: profile.preferred_role },
                { label: 'Experience', value: profile.years_of_experience ? `${profile.years_of_experience} years` : null },
                { label: 'Location', value: profile.location },
                { label: 'Work Mode', value: profile.preferred_work_mode },
                { label: 'Notice Period', value: profile.notice_period_days ? `${profile.notice_period_days} days` : null },
                { label: 'Expected Salary', value: profile.expected_salary_min ? `₹${profile.expected_salary_min}L - ₹${profile.expected_salary_max}L` : null },
                { label: 'Open to Work', value: profile.open_to_work ? 'Yes ✅' : 'No' },
              ].filter(item => item.value).map((item, i) => (
                <div key={i} className="flex gap-2 py-1">
                  <span className="text-gray-400 text-xs min-w-fit">{item.label}:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium capitalize text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Your Applications ──────────────────────────────── */}
        <div className="card p-6 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-lg">📝</span> Your Job Applications
          </h3>
          {loadingApps ? (
            <div className="py-6 flex justify-center">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: `${i*0.15}s`}} />
                ))}
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl block mb-2">💼</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">You haven't applied to any jobs yet.</p>
              <button onClick={() => navigate('/jobseeker/jobs')} className="text-indigo-500 text-sm font-semibold mt-2 hover:text-indigo-600 transition-colors">Browse jobs →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.application_id}
                  className="p-4 bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{app.title}</h4>
                      <p className="text-xs text-indigo-500 font-semibold mt-0.5">{app.company}</p>
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        Applied on {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedApp(app)
                        setShowQueryModal(true)
                        setNewQueryMsg('')
                      }}
                      className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-3.5 py-2 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all cursor-pointer shadow-sm">
                      Raise Query ({app.queries?.length || 0})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Logout ─────────────────────────────────────────── */}
        <button onClick={() => { localStorage.clear(); navigate('/') }}
          className="text-gray-400 hover:text-red-500 text-sm transition-all mb-10 font-medium">
          ← Logout
        </button>
      </div>

      {/* ── Raise Query / Chat Modal ──────────────────────────── */}
      {showQueryModal && selectedApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col shadow-2xl border border-white/10">
            <button
              onClick={() => { setShowQueryModal(false); setSelectedApp(null) }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white text-sm font-bold transition-all border border-gray-200/30 dark:border-white/5 cursor-pointer"
            >✕</button>

            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">Queries & Conversation</h2>
            <p className="text-indigo-500 text-sm font-semibold mb-4">Job: {selectedApp.title} · {selectedApp.company}</p>
            
            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto space-y-4 bg-gray-50/70 dark:bg-slate-950/50 p-4 rounded-2xl border border-gray-100 dark:border-indigo-500/5 min-h-[220px] max-h-[45vh] mb-4 scroll-smooth">
              {(selectedApp.queries && selectedApp.queries.length > 0) ? (
                selectedApp.queries.map((q, idx) => (
                  <div key={idx} className={`flex flex-col ${q.sender === 'seeker' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm ${q.sender === 'seeker' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-none shadow-indigo-500/10' : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-white/5'}`}>
                      <span className="font-bold text-[9px] block mb-1 opacity-70 tracking-wider uppercase">{q.sender === 'seeker' ? 'You' : 'Recruiter'}</span>
                      <p className="leading-relaxed font-medium">{q.message}</p>
                      <span className="text-[8px] opacity-60 block mt-1.5 text-right">
                        {new Date(q.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium italic">No queries yet. Ask the recruiter anything about this job!</p>
                </div>
              )}
            </div>
            
            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newQueryMsg}
                onChange={(e) => setNewQueryMsg(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newQueryMsg.trim()) {
                    const msg = newQueryMsg.trim();
                    setNewQueryMsg('');
                    try {
                      const token = localStorage.getItem('token')
                      const res = await axios.post(`${API}/jobs/applications/${selectedApp.application_id}/query`, {
                        message: msg
                      }, { headers: { Authorization: `Bearer ${token}` } })
                      const updatedQueries = res.data.queries
                      setSelectedApp({ ...selectedApp, queries: updatedQueries })
                      setApplications(prevApps => prevApps.map(a => 
                        a.application_id === selectedApp.application_id ? { ...a, queries: updatedQueries } : a
                      ))
                    } catch (err) { alert('Failed to send query') }
                  }
                }}
                placeholder="Ask about updates, role details, etc..."
                className="flex-1 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button
                onClick={async () => {
                  if (!newQueryMsg.trim()) return
                  try {
                    const token = localStorage.getItem('token')
                    const res = await axios.post(`${API}/jobs/applications/${selectedApp.application_id}/query`, {
                      message: newQueryMsg
                    }, { headers: { Authorization: `Bearer ${token}` } })
                    const updatedQueries = res.data.queries
                    setSelectedApp({ ...selectedApp, queries: updatedQueries })
                    setApplications(prevApps => prevApps.map(a => 
                      a.application_id === selectedApp.application_id ? { ...a, queries: updatedQueries } : a
                    ))
                    setNewQueryMsg('')
                  } catch (err) { alert('Failed to send query') }
                }}
                className="btn-primary px-6 py-3 text-sm cursor-pointer shadow-md shadow-indigo-500/10">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}