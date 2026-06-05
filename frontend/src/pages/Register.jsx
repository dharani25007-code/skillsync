import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(true)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('http://127.0.0.1:8000/auth/register', form)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('name', res.data.name)
      localStorage.setItem('user_id', res.data.user_id)
      if (res.data.role === 'jobseeker') navigate('/jobseeker/dashboard')
      else navigate('/recruiter/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-all duration-300 flex flex-col">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">SkillSync</span>
        </div>
        <button onClick={() => setDark(!dark)}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-lg">
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Create your account
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
            Join SkillSync for free
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          {/* Step 1 — Choose Role */}
          {step === 1 && (
            <div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-4 text-center">I am a...</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => { setForm({...form, role: 'jobseeker'}); setStep(2) }}
                  className="border-2 border-gray-200 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-500 rounded-2xl p-6 text-center transition-all group">
                  <div className="text-4xl mb-3">🎯</div>
                  <div className="font-semibold text-gray-900 dark:text-white group-hover:text-teal-500">Job Seeker</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Find your dream job</div>
                </button>
                <button
                  onClick={() => { setForm({...form, role: 'recruiter'}); setStep(2) }}
                  className="border-2 border-gray-200 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-500 rounded-2xl p-6 text-center transition-all group">
                  <div className="text-4xl mb-3">🏢</div>
                  <div className="font-semibold text-gray-900 dark:text-white group-hover:text-teal-500">Recruiter</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Find top talent</div>
                </button>
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-center text-sm">
                Already have an account?{' '}
                <span onClick={() => navigate('/login')} className="text-teal-500 cursor-pointer hover:underline">
                  Login
                </span>
              </p>
            </div>
          )}

          {/* Step 2 — Fill Details */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setStep(1)}
                  className="text-gray-400 hover:text-teal-500 text-sm">← Back</button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Registering as <span className="text-teal-500 font-medium capitalize">{form.role}</span>
                </span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Full Name</label>
                <input type="text" placeholder="Dharani Dharan" value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  required />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Email Address</label>
                <input type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  required />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Password</label>
                <input type="password" placeholder="Min 8 characters" value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  required minLength={8} />
              </div>

              <button type="submit" disabled={loading}
                className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white py-3 rounded-xl font-semibold text-lg transition-all mt-2">
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>

              <p className="text-gray-400 dark:text-gray-500 text-center text-sm">
                Already have an account?{' '}
                <span onClick={() => navigate('/login')} className="text-teal-500 cursor-pointer hover:underline">
                  Login
                </span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}