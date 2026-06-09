import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate, useLocation } from 'react-router-dom'

const API = 'http://127.0.0.1:8000'

export default function SkillExam() {
  const navigate = useNavigate()
  const location = useLocation()
  const skillFromNav = location.state?.skill || ''

  const [dark, setDark] = useState(true)
  const [phase, setPhase] = useState('select')
  const [selectedSkill, setSelectedSkill] = useState(skillFromNav)
  const [difficulty, setDifficulty] = useState('intermediate')
  const [questions, setQuestions] = useState([])
  const [fullQuestions, setFullQuestions] = useState([]) // with answers
  const [answers, setAnswers] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState(600)
  const [startTime, setStartTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [tabWarnings, setTabWarnings] = useState(0)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // Anti-cheat: detect tab switch
  useEffect(() => {
    if (phase !== 'exam') return
    const handleVisibility = () => {
      if (document.hidden) {
        setTabWarnings(w => {
          const newW = w + 1
          if (newW >= 3) {
            alert('⚠️ Exam auto-submitted due to repeated tab switching!')
            handleSubmit()
          } else {
            alert(`⚠️ Warning ${newW}/3: Do not switch tabs during the exam!`)
          }
          return newW
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [phase, questions, answers, fullQuestions])

  // Timer
  useEffect(() => {
    if (phase !== 'exam') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  const startExam = async () => {
    if (!selectedSkill.trim()) return
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) { navigate('/login'); return }

      const res = await axios.post(`${API}/exam/generate`,
        { skill_name: selectedSkill, difficulty },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setQuestions(res.data.questions)
      setFullQuestions(res.data._full_questions || res.data.questions)
      setAnswers(new Array(res.data.questions.length).fill(-1))
      setTimeLeft(res.data.time_limit_seconds || 600)
      setStartTime(Date.now())
      setPhase('exam')
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError(err.response?.data?.detail || 'Failed to generate exam. Check your Groq API key in .env file.')
      }
    }
    setLoading(false)
  }

  const selectAnswer = (answerIdx) => {
    const updated = [...answers]
    updated[currentQ] = answerIdx
    setAnswers(updated)
  }

  const handleSubmit = async () => {
    clearInterval(timerRef.current)
    setLoading(true)
    setPhase('submitting')

    const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : 600

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API}/exam/submit`, {
        skill_name: selectedSkill,
        questions: fullQuestions,
        answers: answers,
        time_taken_seconds: timeTaken
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(res.data)
      setPhase('result')
    } catch (err) {
      setError('Failed to submit exam. Please try again.')
      setPhase('exam')
    }
    setLoading(false)
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const commonSkills = [
    'Python', 'JavaScript', 'React', 'Machine Learning', 'SQL',
    'Data Science', 'FastAPI', 'Flask', 'NLP', 'Deep Learning',
    'Docker', 'AWS', 'Git', 'TypeScript', 'Node.js',
    'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn'
  ]

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
        <div className="flex items-center gap-3">
          {phase === 'exam' && (
            <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg ${timeLeft < 60 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
          {phase === 'exam' && tabWarnings > 0 && (
            <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 px-3 py-1 rounded-lg text-sm font-medium">
              ⚠️ {tabWarnings}/3 warnings
            </div>
          )}
          <button onClick={() => setDark(!dark)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-lg">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* ── SELECT SKILL ── */}
        {phase === 'select' && (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Skill Exam</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Verify your skills with AI-generated questions. Scores are saved to your profile!
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
                ⚠️ {error}
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Which skill do you want to verify?
              </label>
              <input
                placeholder="e.g. Python, Machine Learning, React..."
                value={selectedSkill}
                onChange={e => setSelectedSkill(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all mb-4" />

              <div className="flex flex-wrap gap-2 mb-5">
                {commonSkills.map(s => (
                  <button key={s} onClick={() => setSelectedSkill(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedSkill === s ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-500'}`}>
                    {s}
                  </button>
                ))}
              </div>

              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { val: 'beginner', label: '🟢 Beginner' },
                  { val: 'intermediate', label: '🟡 Intermediate' },
                  { val: 'advanced', label: '🔴 Advanced' }
                ].map(d => (
                  <button key={d.val} onClick={() => setDifficulty(d.val)}
                    className={`py-2 rounded-xl text-sm font-medium transition-all ${difficulty === d.val ? 'bg-teal-500 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-500 hover:text-teal-500'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5 mb-6">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">⚠️ Exam Rules</h3>
              <ul className="text-sm text-yellow-700 dark:text-yellow-500 space-y-1">
                <li>• 10 AI-generated questions, 10 minutes time limit</li>
                <li>• Do NOT switch tabs — 3 warnings = auto-submit</li>
                <li>• Score ≥ 60% to get verified badge on profile</li>
                <li>• Best score is saved automatically</li>
                <li>• You can retake to improve your score anytime</li>
              </ul>
            </div>

            <button onClick={startExam} disabled={!selectedSkill.trim() || loading}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition-all">
              {loading ? '🧠 Generating AI questions...' : `🚀 Start ${selectedSkill || 'Skill'} Exam`}
            </button>

            <button onClick={() => navigate('/jobseeker/dashboard')}
              className="w-full mt-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm py-2 transition-all">
              ← Back to Dashboard
            </button>
          </div>
        )}

        {/* ── EXAM ── */}
        {phase === 'exam' && questions.length > 0 && (
          <div>
            {/* Progress indicators */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Question {currentQ + 1} of {questions.length}
              </span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} onClick={() => setCurrentQ(i)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${i === currentQ ? 'bg-teal-500 text-white ring-2 ring-teal-300' : answers[i] !== -1 ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                    {answers[i] !== -1 ? '✓' : i + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-6">
              <div className="bg-teal-500 h-1.5 rounded-full transition-all"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-6">
                <span className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {currentQ + 1}
                </span>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white leading-relaxed">
                  {questions[currentQ].question}
                </h3>
              </div>

              <div className="space-y-3">
                {questions[currentQ].options.map((option, i) => (
                  <button key={i} onClick={() => selectAnswer(i)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${answers[currentQ] === i ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-teal-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <span className="font-bold mr-3 text-teal-500">{['A', 'B', 'C', 'D'][i]}.</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              {currentQ > 0 && (
                <button onClick={() => setCurrentQ(currentQ - 1)}
                  className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 rounded-xl font-medium transition-all">
                  ← Prev
                </button>
              )}
              {currentQ < questions.length - 1 ? (
                <button onClick={() => setCurrentQ(currentQ + 1)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl font-semibold transition-all">
                  Next →
                </button>
              ) : (
                <button onClick={handleSubmit}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-all">
                  ✅ Submit Exam ({answers.filter(a => a !== -1).length}/{questions.length} answered)
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── SUBMITTING ── */}
        {phase === 'submitting' && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 animate-pulse">🧠</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Evaluating your answers...</h2>
            <p className="text-gray-500 dark:text-gray-400">AI is checking your responses</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {phase === 'result' && result && (
          <div>
            <div className={`text-center py-8 rounded-2xl mb-6 ${result.passed ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
              <div className="text-5xl mb-3">{result.passed ? '🏆' : '📚'}</div>
              <h2 className="text-4xl font-bold mb-2" style={{ color: result.passed ? '#14b8a6' : '#ef4444' }}>
                {result.score}%
              </h2>
              <p className="font-semibold text-gray-900 dark:text-white mb-1 text-lg">
                {result.passed ? '✅ Skill Verified!' : '❌ Not Passed Yet'}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {result.correct}/{result.total} correct answers
              </p>
              {result.passed && (
                <div className="mt-3 inline-block bg-teal-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                  🎖️ {selectedSkill} Badge Added to Profile!
                </div>
              )}
            </div>

            <p className="text-center text-gray-600 dark:text-gray-400 mb-6 text-sm">
              {result.message}
            </p>

            {/* Review */}
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">📋 Question Review:</h3>
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {result.results?.map((r, i) => (
                <div key={i} className={`rounded-xl p-4 border ${r.is_correct ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-start gap-2 mb-1">
                    <span>{r.is_correct ? '✅' : '❌'}</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.question}</p>
                  </div>
                  {!r.is_correct && r.explanation && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                      💡 {r.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setPhase('select'); setResult(null); setAnswers([]); setCurrentQ(0); setError('') }}
                className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 py-3 rounded-xl font-medium transition-all">
                🔄 Retake / New Exam
              </button>
              <button onClick={() => navigate('/jobseeker/dashboard')}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl font-semibold transition-all">
                ← Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}