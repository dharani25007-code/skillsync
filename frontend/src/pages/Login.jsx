import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || '${API}'

export default function Login() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API}/auth/login`, form)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('name', res.data.name)
      localStorage.setItem('user_id', res.data.user_id)
      if (res.data.role === 'jobseeker') navigate('/jobseeker/dashboard')
      else navigate('/recruiter/dashboard')
    } catch {
      setError('Invalid email or password')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-mesh transition-all duration-300 flex flex-col">

      {/* Navbar */}
      <nav className="glass border-b border-white/10 dark:border-indigo-500/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-8 py-4">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all group-hover:scale-105">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Skill<span className="gradient-text">Sync</span>
            </span>
          </div>
          <button onClick={() => setDark(!dark)}
            className="p-2.5 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-lg transition-all border border-gray-200/50 dark:border-white/5">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* Form Area */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Background orbs */}
        <div className="orb w-72 h-72 bg-indigo-400 -top-10 -left-20" />
        <div className="orb w-64 h-64 bg-violet-400 -bottom-10 -right-20" style={{animationDelay: '3s'}} />

        <div className="w-full max-w-md relative z-10">
          <div className="card p-8 md:p-10">
            {/* Icon */}
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
              <span className="text-white text-2xl">👋</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2 text-center">
              Welcome back!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-8 text-sm">
              Login to your SkillSync account
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-center text-sm flex items-center justify-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Email Address
                </label>
                <input type="email" placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3.5 rounded-xl transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Password
                </label>
                <input type="password" placeholder="Your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3.5 rounded-xl transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required />
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary py-3.5 text-lg mt-1 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Logging in…
                  </span>
                ) : 'Login →'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
              <p className="text-gray-400 dark:text-gray-500 text-center text-sm">
                No account?{' '}
                <span onClick={() => navigate('/register')}
                  className="text-indigo-500 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors">
                  Create one free →
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
