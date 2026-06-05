import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-all duration-300">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
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
          <button onClick={() => navigate('/login')}
            className="text-gray-600 dark:text-gray-300 hover:text-teal-500 font-medium px-4 py-2">
            Login
          </button>
          <button onClick={() => navigate('/register')}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-semibold transition-all">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-block bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
          India's Smartest Hiring Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Skills Verified.<br />
          <span className="text-teal-500">Talent Found.</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed">
          Stop guessing. Start knowing. SkillSync verifies real skills through AI-powered exams and matches the right talent to the right job — instantly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => navigate('/register')}
            className="bg-teal-500 hover:bg-teal-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-teal-500/25">
            Find a Job →
          </button>
          <button onClick={() => navigate('/register')}
            className="border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 px-10 py-4 rounded-xl font-semibold text-lg transition-all">
            Hire Talent →
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto px-6 py-12 border-t border-b border-gray-100 dark:border-gray-800">
        {[
          { number: '10K+', label: 'Verified Candidates' },
          { number: '500+', label: 'Companies Hiring' },
          { number: '95%', label: 'Match Accuracy' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl font-bold text-teal-500 mb-1">{s.number}</div>
            <div className="text-gray-500 dark:text-gray-400 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Why SkillSync?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '🧠', title: 'AI Skill Exams', desc: 'Candidates prove their skills through intelligent AI-generated tests. No more fake resumes.' },
            { icon: '⚡', title: 'Instant Matching', desc: 'Our AI engine ranks candidates in seconds. Find your perfect hire without scrolling through hundreds of profiles.' },
            { icon: '🔒', title: 'Verified Profiles', desc: 'Every skill is tested and verified. Recruiters get confidence. Candidates get recognition.' },
          ].map((f, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-teal-500 transition-all">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-teal-500 mx-6 mb-16 rounded-3xl py-16 px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
        <p className="text-teal-100 mb-8 text-lg">Join thousands of job seekers and recruiters on SkillSync</p>
        <button onClick={() => navigate('/register')}
          className="bg-white text-teal-600 hover:bg-gray-100 px-10 py-4 rounded-xl font-bold text-lg transition-all">
          Create Free Account →
        </button>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800">
        © 2026 SkillSync. Built for INDIA RUNS Hackathon.
      </footer>

    </div>
  )
}