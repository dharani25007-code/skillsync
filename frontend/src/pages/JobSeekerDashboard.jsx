import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

export default function JobSeekerDashboard() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'User'
  const [dark, setDark] = useState(true)
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
          <div
            onClick={() => navigate('/jobseeker/profile')}
            className="w-9 h-9 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Welcome */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          Welcome back, {name}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {profile?.headline || 'Complete your profile to get matched with top jobs'}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Profile Complete', value: `${Math.round(completeness)}%`, icon: '👤', color: 'teal' },
            { label: 'Skills Added', value: skills.length, icon: '🛠️', color: 'blue' },
            { label: 'Skills Verified', value: verifiedSkills, icon: '✅', color: 'green' },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-teal-500 mb-1">{stat.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Profile Completion Bar */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900 dark:text-white">Profile Completion</span>
            <span className="text-teal-500 font-bold">{Math.round(completeness)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
            <div className="bg-teal-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${completeness}%` }} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {completeness < 50 ? '🚀 Add more details to get better job matches' :
              completeness < 80 ? '💪 Almost there! Complete remaining sections' :
                '🏆 Great profile! You\'re getting better matches now'}
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            {
              icon: '👤', title: 'Complete Profile',
              desc: 'Add skills, experience, education and more',
              action: 'Edit Profile', color: 'teal', link: '/jobseeker/profile'
            },
            {
              icon: '🧠', title: 'Take Skill Exam',
              desc: 'Verify skills with AI-generated tests and get badges',
              action: 'Start Exam',
              color: 'purple',
              link: '/jobseeker/exam'
            },
            {
              icon: '💼', title: 'Browse Jobs',
              desc: 'Find jobs that match your verified skills',
              action: 'Browse Jobs', color: 'blue', link: '/jobseeker/jobs'
            },
          ].map((card, i) => (
            <div key={i}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:border-teal-500 transition-all">
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{card.desc}</p>
              <button
                onClick={() => card.link && navigate(card.link)}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                  card.color === 'teal' ? 'bg-teal-500 text-white hover:bg-teal-600 cursor-pointer' :
                  card.color === 'purple' ? 'bg-purple-500 text-white hover:bg-purple-600 cursor-pointer' :
                  card.color === 'blue' ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}>
                {card.action}
              </button>
            </div>
          ))}
        </div>

        {/* Verified Skills */}
        {Object.keys(examScores).length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">🏆 Verified Skills</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(examScores).map(([skill, score], i) => (
                <div key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
                    score >= 60
                      ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>
                  {score >= 60 ? '✅' : '❌'} {skill}
                  <span className="font-bold">{score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Exam History */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">🧠 Your Exam Attempts</h3>
          {loadingExams ? (
            <p className="text-xs text-gray-400">Loading your exam history...</p>
          ) : exams.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">You haven't taken any skill exams yet.</p>
          ) : (
            <div className="space-y-4">
              {exams.map((attempt) => (
                <div key={attempt.id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-teal-500/50 transition-all">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{attempt.skill_name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Score: <span className="font-semibold text-teal-500">{attempt.score}%</span> ({attempt.correct_answers}/{attempt.total_questions} correct)
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        Taken on {new Date(attempt.created_at).toLocaleDateString()} at {new Date(attempt.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        attempt.passed
                          ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                      }`}>
                        {attempt.passed ? '✅ Passed (Badge Added)' : '❌ Failed (< 60%)'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Summary */}
        {profile && profile.current_title && (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 dark:text-white">Your Profile Summary</h3>
              <button onClick={() => navigate('/jobseeker/profile')}
                className="text-teal-500 text-sm hover:underline">Edit →</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
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
                <div key={i} className="flex gap-2">
                  <span className="text-gray-400 min-w-fit">{item.label}:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Applications */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">📝 Your Job Applications</h3>
          {loadingApps ? (
            <p className="text-xs text-gray-400">Loading your applications...</p>
          ) : applications.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">You haven't applied to any jobs yet.</p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.application_id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-teal-500/50 transition-all">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{app.title}</h4>
                      <p className="text-xs text-teal-500 font-semibold mt-0.5">{app.company}</p>
                      <p className="text-[10px] text-gray-405 dark:text-gray-400 mt-1.5">
                        Applied on {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedApp(app)
                          setShowQueryModal(true)
                          setNewQueryMsg('')
                        }}
                        className="text-xs font-semibold bg-teal-50 dark:bg-teal-900/20 text-teal-650 dark:text-teal-400 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-850 hover:bg-teal-500 hover:text-white transition-all cursor-pointer">
                        Rise Query ({app.queries?.length || 0})
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => { localStorage.clear(); navigate('/') }}
          className="text-gray-400 hover:text-red-500 text-sm transition-all mb-10">
          → Logout
        </button>
      </div>

      {/* Rise Query / Chat Modal */}
      {showQueryModal && selectedApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col border border-gray-150 dark:border-gray-800 shadow-2xl">
            <button
              onClick={() => {
                setShowQueryModal(false)
                setSelectedApp(null)
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Queries & Messages</h2>
            <p className="text-teal-500 text-sm font-semibold mb-4">Job: {selectedApp.title}</p>
            
            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[200px] max-h-[40vh] mb-4">
              {(selectedApp.queries && selectedApp.queries.length > 0) ? (
                selectedApp.queries.map((q, idx) => (
                  <div key={idx} className={`flex flex-col ${q.sender === 'seeker' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-xl p-3 text-xs ${q.sender === 'seeker' ? 'bg-teal-500 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-850 text-gray-805 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-800'}`}>
                      <span className="font-bold text-[9px] block mb-0.5 opacity-80">{q.sender === 'seeker' ? 'You' : 'Recruiter'}</span>
                      <p className="leading-relaxed">{q.message}</p>
                      <span className="text-[8px] opacity-70 block mt-1 text-right">
                        {new Date(q.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <span className="text-2xl block mb-2">💬</span>
                  <p className="text-xs text-gray-400 italic">No queries raised yet. Type a query below to ask the recruiter anything about this application!</p>
                </div>
              )}
            </div>
            
            {/* Input Form */}
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
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      })
                      
                      const updatedQueries = res.data.queries
                      setSelectedApp({ ...selectedApp, queries: updatedQueries })
                      setApplications(prevApps => prevApps.map(a => 
                        a.application_id === selectedApp.application_id ? { ...a, queries: updatedQueries } : a
                      ))
                    } catch (err) {
                      alert('Failed to send query')
                    }
                  }
                }}
                placeholder="Ask about updates, change resume details, etc..."
                className="flex-1 border border-gray-200 dark:border-gray-750 rounded-xl px-4 py-2 bg-transparent text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={async () => {
                  if (!newQueryMsg.trim()) return
                  try {
                    const token = localStorage.getItem('token')
                    const res = await axios.post(`${API}/jobs/applications/${selectedApp.application_id}/query`, {
                      message: newQueryMsg
                    }, {
                      headers: { Authorization: `Bearer ${token}` }
                    })
                    
                    const updatedQueries = res.data.queries
                    setSelectedApp({ ...selectedApp, queries: updatedQueries })
                    setApplications(prevApps => prevApps.map(a => 
                      a.application_id === selectedApp.application_id ? { ...a, queries: updatedQueries } : a
                    ))
                    setNewQueryMsg('')
                  } catch (err) {
                    alert('Failed to send query')
                  }
                }}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-5 py-2 rounded-xl transition-all cursor-pointer shadow-lg shadow-teal-500/20"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}