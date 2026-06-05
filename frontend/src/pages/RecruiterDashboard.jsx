import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Recruiter'
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
          <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          Welcome, {name}! 🏢
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10">
          Find the perfect candidates for your job openings
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          {[
            { number: '0', label: 'Active Jobs', icon: '💼' },
            { number: '0', label: 'Candidates Ranked', icon: '👥' },
            { number: '0', label: 'Shortlisted', icon: '⭐' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-3xl font-bold text-teal-500 mb-1">{s.number}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: '🎯', title: 'Find Candidates with AI', desc: 'Post a job description and let our AI rank the best candidates instantly', action: 'Start Ranking', color: 'teal', link: '/recruiter/rank' },
            { icon: '📊', title: 'Upload Your Dataset', desc: 'Already have a candidate dataset? Upload CSV and rank them with AI', action: 'Upload Dataset', color: 'teal', link: '/recruiter/rank' },
            { icon: '📋', title: 'My Job Posts', desc: 'View and manage all your active job postings', action: 'Coming Soon', color: 'gray', link: null },
            { icon: '🏆', title: 'Shortlisted Candidates', desc: 'View candidates you have shortlisted from previous rankings', action: 'Coming Soon', color: 'gray', link: null },
          ].map((card, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:border-teal-500 transition-all">
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{card.desc}</p>
              <button
                onClick={() => card.link && navigate(card.link)}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${card.color === 'teal' ? 'bg-teal-500 text-white hover:bg-teal-600 cursor-pointer' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}>
                {card.action}
              </button>
            </div>
          ))}
        </div>

        <button onClick={() => { localStorage.clear(); navigate('/') }}
          className="mt-10 text-gray-400 hover:text-red-500 text-sm transition-all">
          → Logout
        </button>
      </div>
    </div>
  )
}