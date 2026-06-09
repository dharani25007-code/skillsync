import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'Recruiter'
  const [dark, setDark] = useState(true)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
    document.documentElement.classList.toggle('dark', dark)
    loadHistory()
  }, [dark])

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/ranking/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHistory(res.data || [])
    } catch (err) { }
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
            { number: history.length, label: 'Ranking Sessions', icon: '📊' },
            { number: history.reduce((acc, h) => acc + (h.results?.length || 0), 0), label: 'Candidates Ranked', icon: '👥' },
            { number: '100K+', label: 'Dataset Size', icon: '🗄️' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-3xl font-bold text-teal-500 mb-1">{s.number}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {[
            {
              icon: '🎯',
              title: 'Rank Candidates with AI',
              desc: 'Post a job description and let our AI rank the best candidates instantly from 100K+ profiles',
              action: 'Start Ranking',
              color: 'teal',
              link: '/recruiter/rank'
            },
            {
              icon: '📊',
              title: 'Use INDIA RUNS Dataset',
              desc: 'Rank candidates from the official 100K Redrob hackathon dataset',
              action: 'Use Dataset',
              color: 'teal',
              link: '/recruiter/rank'
            },
            {
              icon: '📁',
              title: 'Upload Your Own Dataset',
              desc: 'Upload your own CSV candidate dataset and rank with AI',
              action: 'Upload CSV',
              color: 'teal',
              link: '/recruiter/rank'
            },
            {
              icon: '✅',
              title: 'SkillSync Verified Talent',
              desc: 'Access candidates who have taken AI skill exams and have verified scores',
              action: 'View Verified',
              color: 'teal',
              link: '/recruiter/rank'
            },
          ].map((card, i) => (
            <div key={i}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:border-teal-500 transition-all">
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{card.desc}</p>
              <button
                onClick={() => card.link && navigate(card.link)}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 cursor-pointer transition-all">
                {card.action}
              </button>
            </div>
          ))}
        </div>

        {/* Recent Rankings */}
        {history.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">📋 Recent Ranking Sessions</h3>
            <div className="space-y-3">
              {history.slice(0, 5).map((h, i) => (
                <div key={i}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
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
          className="text-gray-400 hover:text-red-500 text-sm transition-all">
          → Logout
        </button>
      </div>
    </div>
  )
}