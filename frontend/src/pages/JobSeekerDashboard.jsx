import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function JobSeekerDashboard() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'User'
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

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
          <div className="w-9 h-9 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          Welcome back, {name}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10">
          Complete your profile to get matched with top jobs
        </p>

        {/* Progress */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900 dark:text-white">Profile Completion</span>
            <span className="text-teal-500 font-bold">20%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-teal-500 h-2 rounded-full" style={{width: '20%'}}></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Complete your profile to get better job matches</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '👤', title: 'Complete Profile', desc: 'Add your skills, experience and education', action: 'Start Now', color: 'teal', link: '/jobseeker/profile' },
            { icon: '🧠', title: 'Take Skill Exam', desc: 'Verify your skills with AI-powered tests', action: 'Coming Soon', color: 'gray', link: null },
            { icon: '💼', title: 'Browse Jobs', desc: 'Find jobs that match your verified skills', action: 'Coming Soon', color: 'gray', link: null },
          ].map((card, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:border-teal-500 transition-all">
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{card.desc}</p>
              <button
                onClick={() => card.link && navigate(card.link)}
                className={`text-sm font-medium px-4 py-2 rounded-lg ${card.color === 'teal' ? 'bg-teal-500 text-white hover:bg-teal-600 cursor-pointer' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}>
                {card.action}
              </button>
            </div>
          ))}
        </div>

        {/* Logout */}
        <button onClick={() => { localStorage.clear(); navigate('/') }}
          className="mt-10 text-gray-400 hover:text-red-500 text-sm transition-all">
          → Logout
        </button>
      </div>
    </div>
  )
}