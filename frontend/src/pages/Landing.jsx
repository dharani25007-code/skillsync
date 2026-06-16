import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const [countUp, setCountUp] = useState({ candidates: 0, companies: 0, accuracy: 0 })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Animated counter effect
  useEffect(() => {
    const duration = 1800
    const steps = 40
    const interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCountUp({
        candidates: Math.round(100000 * eased),
        companies: Math.round(500 * eased),
        accuracy: Math.round(95 * eased),
      })
      if (step >= steps) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-mesh transition-all duration-300">

      {/* ── Premium Navbar ───────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-white/10 dark:border-indigo-500/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-8 py-4">
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
              className="p-2.5 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-lg transition-all border border-gray-200/50 dark:border-white/5"
              aria-label="Toggle theme">
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => navigate('/login')}
              className="text-gray-600 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400 font-semibold px-4 py-2.5 transition-colors hidden sm:block">
              Login
            </button>
            <button onClick={() => navigate('/register')}
              className="btn-primary px-6 py-2.5 text-sm">
              Get Started →
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Floating Orbs */}
        <div className="orb w-72 h-72 bg-indigo-400 top-20 -left-20" style={{animationDelay: '0s'}} />
        <div className="orb w-96 h-96 bg-teal-400 top-40 -right-20" style={{animationDelay: '2s'}} />
        <div className="orb w-64 h-64 bg-violet-400 bottom-20 left-1/3" style={{animationDelay: '4s'}} />

        <div className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-28">
          {/* Badge */}
          <div className="slide-up inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-sm font-semibold px-5 py-2.5 rounded-full mb-8 border border-indigo-100 dark:border-indigo-800/50">
            <span className="w-2 h-2 bg-indigo-500 rounded-full pulse-ring" />
            India's Smartest AI Hiring Platform
          </div>

          {/* Headline */}
          <h1 className="slide-up slide-up-delay-1 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 dark:text-white mb-6 leading-[1.05] tracking-tight">
            Skills Verified.<br />
            <span className="gradient-text">Talent Found.</span>
          </h1>

          {/* Subheadline */}
          <p className="slide-up slide-up-delay-2 text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mb-12 leading-relaxed">
            Stop guessing. Start knowing. SkillSync verifies real skills through
            <span className="text-indigo-500 dark:text-indigo-400 font-semibold"> AI-powered exams </span>
            and matches the right talent to the right job — instantly.
          </p>

          {/* CTA Buttons */}
          <div className="slide-up slide-up-delay-3 flex flex-col sm:flex-row gap-4">
            <button onClick={() => navigate('/register')}
              className="btn-primary px-10 py-4 text-lg">
              Find a Job →
            </button>
            <button onClick={() => navigate('/register')}
              className="btn-secondary px-10 py-4 text-lg">
              Hire Talent →
            </button>
          </div>

          {/* Trust Badges */}
          <div className="slide-up slide-up-delay-4 flex items-center gap-6 mt-10 text-sm text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1.5">✅ Free to use</span>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">•</span>
            <span className="flex items-center gap-1.5 hidden sm:flex">🔒 Verified Skills</span>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">•</span>
            <span className="flex items-center gap-1.5 hidden sm:flex">⚡ Instant AI Matching</span>
          </div>
        </div>
      </div>

      {/* ── Animated Stats ───────────────────────────────────── */}
      <div className="relative">
        <div className="max-w-4xl mx-auto px-6 -mt-8">
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {[
              { number: `${(countUp.candidates / 1000).toFixed(0)}K+`, label: 'Candidate Profiles', icon: '👥', gradient: 'from-indigo-500 to-violet-500' },
              { number: `${countUp.companies}+`, label: 'Companies Hiring', icon: '🏢', gradient: 'from-teal-500 to-emerald-500' },
              { number: `${countUp.accuracy}%`, label: 'Match Accuracy', icon: '🎯', gradient: 'from-amber-500 to-orange-500' },
            ].map((s, i) => (
              <div key={i} className="card p-6 md:p-8 text-center glow-hover">
                <div className="text-2xl md:text-3xl mb-2">{s.icon}</div>
                <div className={`text-3xl md:text-4xl font-black bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent mb-1`}>
                  {s.number}
                </div>
                <div className="text-gray-500 dark:text-gray-400 font-medium text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features Section ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
            Why <span className="gradient-text">SkillSync</span>?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            A smarter hiring experience for everyone — powered by explainable AI
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🧠', title: 'AI Skill Exams',
              desc: 'Candidates prove their skills through intelligent AI-generated tests. No more fake resumes.',
              gradient: 'from-indigo-500/10 to-violet-500/10',
              border: 'hover:border-indigo-400'
            },
            {
              icon: '⚡', title: 'Instant Matching',
              desc: 'Our 5-signal AI engine ranks candidates in seconds. Find your perfect hire instantly.',
              gradient: 'from-teal-500/10 to-emerald-500/10',
              border: 'hover:border-teal-400'
            },
            {
              icon: '🔍', title: 'Full Explainability',
              desc: 'Every ranking decision is transparent. See exactly why a candidate was scored the way they were.',
              gradient: 'from-amber-500/10 to-orange-500/10',
              border: 'hover:border-amber-400'
            },
          ].map((f, i) => (
            <div key={i}
              className={`card bg-gradient-to-br ${f.gradient} p-8 glow-hover ${f.border} cursor-default`}>
              <div className="text-4xl mb-5">{f.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works ─────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
            How it works
          </h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Create Profile', desc: 'Add your skills, experience, and career history', icon: '👤' },
            { step: '02', title: 'Take AI Exams', desc: 'Verify your skills with AI-generated tests', icon: '📝' },
            { step: '03', title: 'Get Matched', desc: 'Our AI matches you with relevant opportunities', icon: '🎯' },
            { step: '04', title: 'Get Hired', desc: 'Connect with recruiters and land your dream job', icon: '🚀' },
          ].map((item, i) => (
            <div key={i} className="relative text-center">
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="text-xs font-black text-indigo-500 dark:text-indigo-400 mb-2 tracking-widest">STEP {item.step}</div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              {i < 3 && (
                <div className="hidden md:block absolute top-6 -right-3 text-gray-300 dark:text-gray-600 text-2xl">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA Section ──────────────────────────────────────── */}
      <div className="px-6 pb-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 rounded-3xl py-16 px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 dot-pattern opacity-20" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to get started?</h2>
            <p className="text-indigo-200 mb-8 text-lg max-w-lg mx-auto">
              Join thousands of job seekers and recruiters on India's smartest hiring platform
            </p>
            <button onClick={() => navigate('/register')}
              className="bg-white text-indigo-600 hover:bg-gray-100 px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-black/10 hover:shadow-2xl hover:scale-105">
              Create Free Account →
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">S</span>
            </div>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">SkillSync</span>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center">
            © 2026 SkillSync. Built for INDIA RUNS Hackathon.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
            <span className="hover:text-indigo-500 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-indigo-500 cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
