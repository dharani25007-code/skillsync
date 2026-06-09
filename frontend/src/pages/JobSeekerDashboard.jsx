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

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    document.documentElement.classList.toggle('dark', dark)
    loadProfile()
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

        <button onClick={() => { localStorage.clear(); navigate('/') }}
          className="text-gray-400 hover:text-red-500 text-sm transition-all">
          → Logout
        </button>
      </div>
    </div>
  )
}