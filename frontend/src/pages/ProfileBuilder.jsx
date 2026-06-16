import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function ProfileBuilder() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
 
  const [profile, setProfile] = useState({
    // Basic Info
    headline: '',
    summary: '',
    location: '',
    country: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    // Job Preferences
    current_title: '',
    current_company: '',
    current_company_size: '',
    current_industry: '',
    preferred_role: '',
    years_of_experience: 0,
    expected_salary_min: 0,
    expected_salary_max: 0,
    notice_period_days: 30,
    preferred_work_mode: 'flexible',
    willing_to_relocate: false,
    open_to_work: true,
    // Arrays
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    languages: [],
    projects: [],
  })
 
  const [skillInput, setSkillInput] = useState('')
  const [certInput, setCertInput] = useState({ name: '', issuer: '', year: '', credential_url: '' })
  const [langInput, setLangInput] = useState({ language: '', proficiency: 'professional' })
 
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    loadProfile()
  }, [dark])

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/profile/jobseeker`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data && Object.keys(res.data).length > 0) {
        setProfile(prev => ({ ...prev, ...res.data }))
      }
    } catch (err) { }
  }

  const up = (field, value) => setProfile(p => ({ ...p, [field]: value }))

  // Skills
  const addSkill = () => {
    if (!skillInput.trim()) return
    const exists = profile.skills.find(s => s.name.toLowerCase() === skillInput.toLowerCase())
    if (exists) return
    up('skills', [...profile.skills, {
      name: skillInput.trim(),
      proficiency: 'intermediate',
      endorsements: 0,
      duration_months: 0,
      exam_score: null
    }])
    setSkillInput('')
  }
  const updateSkill = (i, field, value) => {
    const updated = [...profile.skills]
    updated[i][field] = value
    up('skills', updated)
  }
  const removeSkill = (i) => up('skills', profile.skills.filter((_, idx) => idx !== i))

  // Experience
  const addExp = () => up('experience', [...profile.experience, {
    company: '', title: '', start_date: '', end_date: '',
    duration_months: 0, is_current: false, industry: '',
    company_size: '', description: ''
  }])
  const updateExp = (i, field, value) => {
    const updated = [...profile.experience]
    updated[i][field] = value
    up('experience', updated)
  }
  const removeExp = (i) => up('experience', profile.experience.filter((_, idx) => idx !== i))

  // Education
  const addEdu = () => up('education', [...profile.education, {
    institution: '', degree: '', field_of_study: '',
    start_year: '', end_year: '', grade: '', tier: 'unknown'
  }])
  const updateEdu = (i, field, value) => {
    const updated = [...profile.education]
    updated[i][field] = value
    up('education', updated)
  }
  const removeEdu = (i) => up('education', profile.education.filter((_, idx) => idx !== i))

  // Certifications
  const addCert = () => {
    if (!certInput.name.trim()) return
    up('certifications', [...profile.certifications, { ...certInput }])
    setCertInput({ name: '', issuer: '', year: '', credential_url: '' })
  }
  const removeCert = (i) => up('certifications', profile.certifications.filter((_, idx) => idx !== i))

  // Languages
  const addLang = () => {
    if (!langInput.language.trim()) return
    up('languages', [...profile.languages, { ...langInput }])
    setLangInput({ language: '', proficiency: 'professional' })
  }
  const removeLang = (i) => up('languages', profile.languages.filter((_, idx) => idx !== i))

  // Projects
  const addProject = () => up('projects', [...profile.projects, {
    title: '', description: '', tech_stack: '', url: '', year: ''
  }])
  const updateProject = (i, field, value) => {
    const updated = [...profile.projects]
    updated[i][field] = value
    up('projects', updated)
  }
  const removeProject = (i) => up('projects', profile.projects.filter((_, idx) => idx !== i))

  const saveProfile = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API}/profile/jobseeker`, profile, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSaved(true)
      setTimeout(() => navigate('/jobseeker/dashboard'), 1500)
    } catch (err) {
      alert('Failed to save. Please try again.')
    }
    setLoading(false)
  }

  const steps = ['Basic Info', 'Job Preferences', 'Skills', 'Experience', 'Education', 'More', 'Review']

  const inputClass = "w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
  const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block"
  const smallInputClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm w-full"

  return (
    <div className="min-h-screen bg-mesh transition-all duration-300">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/10 dark:border-indigo-500/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 md:px-8 py-4">
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
              className="p-2.5 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-lg transition-all border border-gray-200/50 dark:border-white/5">
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => navigate('/jobseeker/dashboard')}
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-500 text-sm font-semibold transition-colors">
              ← Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-10 bg-white/40 dark:bg-slate-900/40 p-5 rounded-2xl border border-gray-150/40 dark:border-white/5 overflow-x-auto pb-3 gap-2">
          {steps.map((s, i) => {
            const isActive = i + 1 === step
            const isCompleted = i + 1 < step
            return (
              <div key={i} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center gap-1.5 cursor-pointer group flex-shrink-0" onClick={() => setStep(i + 1)}>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                        : isActive
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white ring-4 ring-indigo-500/20 shadow-md shadow-indigo-500/20'
                        : 'bg-gray-150 dark:bg-gray-800 text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-750'
                    }`}
                  >
                    {isCompleted ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-[10px] font-bold tracking-tight transition-colors ${
                      isActive
                        ? 'text-indigo-500 dark:text-indigo-400 font-extrabold'
                        : isCompleted
                        ? 'text-gray-700 dark:text-gray-300 font-semibold'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {s}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 min-w-[12px] mx-1 transition-colors ${isCompleted ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ marginTop: '-18px' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: Basic Info ── */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Basic Information</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Your personal details and online presence</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Professional Headline *</label>
                <input placeholder="e.g. Python Developer | ML Engineer | 5 years experience"
                  value={profile.headline} onChange={e => up('headline', e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Professional Summary *</label>
                <textarea placeholder="Tell recruiters about yourself, your experience and what you're looking for..."
                  value={profile.summary} rows={4}
                  onChange={e => up('summary', e.target.value)}
                  className={inputClass + " resize-none"} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Location (City) *</label>
                  <input placeholder="e.g. Chennai" value={profile.location}
                    onChange={e => up('location', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Country *</label>
                  <input placeholder="e.g. India" value={profile.country}
                    onChange={e => up('country', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input placeholder="+91 9876543210" value={profile.phone}
                    onChange={e => up('phone', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" value={profile.date_of_birth}
                    onChange={e => up('date_of_birth', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select value={profile.gender} onChange={e => up('gender', e.target.value)}
                  className={inputClass}>
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>LinkedIn URL</label>
                <input placeholder="https://linkedin.com/in/yourname" value={profile.linkedin_url}
                  onChange={e => up('linkedin_url', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>GitHub URL</label>
                <input placeholder="https://github.com/yourname" value={profile.github_url}
                  onChange={e => up('github_url', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Portfolio / Website</label>
                <input placeholder="https://yourportfolio.com" value={profile.portfolio_url}
                  onChange={e => up('portfolio_url', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Job Preferences ── */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Job Preferences</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Your current role and what you're looking for</p>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Current Job Title</label>
                  <input placeholder="e.g. Software Engineer" value={profile.current_title}
                    onChange={e => up('current_title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Current Company</label>
                  <input placeholder="e.g. Infosys" value={profile.current_company}
                    onChange={e => up('current_company', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Company Size</label>
                  <select value={profile.current_company_size}
                    onChange={e => up('current_company_size', e.target.value)} className={inputClass}>
                    <option value="">Select size</option>
                    {['1-10','11-50','51-200','201-500','501-1000','1001-5000','5001-10000','10001+'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Industry</label>
                  <input placeholder="e.g. IT Services" value={profile.current_industry}
                    onChange={e => up('current_industry', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Preferred Role (What job do you want?)</label>
                <input placeholder="e.g. ML Engineer, Data Scientist" value={profile.preferred_role}
                  onChange={e => up('preferred_role', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Total Years of Experience</label>
                <input type="number" min="0" max="50" step="0.5"
                  placeholder="e.g. 3.5" value={profile.years_of_experience}
                  onChange={e => up('years_of_experience', parseFloat(e.target.value))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Expected Salary Range (LPA)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Min (e.g. 8)" value={profile.expected_salary_min}
                    onChange={e => up('expected_salary_min', parseFloat(e.target.value))}
                    className={inputClass} />
                  <input type="number" placeholder="Max (e.g. 15)" value={profile.expected_salary_max}
                    onChange={e => up('expected_salary_max', parseFloat(e.target.value))}
                    className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Notice Period (Days)</label>
                <input type="number" min="0" max="180" placeholder="e.g. 30"
                  value={profile.notice_period_days}
                  onChange={e => up('notice_period_days', parseInt(e.target.value))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Preferred Work Mode</label>
                <select value={profile.preferred_work_mode}
                  onChange={e => up('preferred_work_mode', e.target.value)} className={inputClass}>
                  <option value="flexible">Flexible</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={profile.willing_to_relocate}
                    onChange={e => up('willing_to_relocate', e.target.checked)}
                    className="w-4 h-4 accent-teal-500" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">Willing to Relocate</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={profile.open_to_work}
                    onChange={e => up('open_to_work', e.target.checked)}
                    className="w-4 h-4 accent-teal-500" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">Open to Work</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Skills ── */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Skills</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Add your skills — these will be verified by AI exam</p>

            <div className="flex gap-2 mb-4">
              <input placeholder="e.g. Python, Machine Learning, React"
                value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
                className={inputClass} />
              <button onClick={addSkill}
                className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold transition-all whitespace-nowrap">
                Add
              </button>
            </div>

            <div className="space-y-3">
              {profile.skills.map((s, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                    <button onClick={() => removeSkill(i)} className="text-red-400 hover:text-red-500 text-sm">Remove</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Proficiency</label>
                      <select value={s.proficiency} onChange={e => updateSkill(i, 'proficiency', e.target.value)}
                        className={smallInputClass}>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Months Used</label>
                      <input type="number" min="0" value={s.duration_months}
                        onChange={e => updateSkill(i, 'duration_months', parseInt(e.target.value))}
                        className={smallInputClass} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Endorsements</label>
                      <input type="number" min="0" value={s.endorsements}
                        onChange={e => updateSkill(i, 'endorsements', parseInt(e.target.value))}
                        className={smallInputClass} />
                    </div>
                  </div>
                  {s.exam_score !== null && s.exam_score !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-teal-500 font-medium">✅ Verified Score: {s.exam_score}%</span>
                    </div>
                  )}
                </div>
              ))}
              {profile.skills.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No skills added yet</p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Experience ── */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Work Experience</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Add your work history</p>

            {profile.experience.map((exp, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-gray-900 dark:text-white">Experience {i + 1}</span>
                  <button onClick={() => removeExp(i)} className="text-red-400 hover:text-red-500 text-sm">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Company *</label>
                    <input placeholder="Company name" value={exp.company}
                      onChange={e => updateExp(i, 'company', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Job Title *</label>
                    <input placeholder="Your role" value={exp.title}
                      onChange={e => updateExp(i, 'title', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Industry</label>
                    <input placeholder="e.g. IT Services" value={exp.industry}
                      onChange={e => updateExp(i, 'industry', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Company Size</label>
                    <select value={exp.company_size} onChange={e => updateExp(i, 'company_size', e.target.value)}
                      className={smallInputClass}>
                      <option value="">Select</option>
                      {['1-10','11-50','51-200','201-500','501-1000','1001-5000','5001-10000','10001+'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                    <input type="date" value={exp.start_date}
                      onChange={e => updateExp(i, 'start_date', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">End Date</label>
                    <input type="date" value={exp.end_date || ''}
                      disabled={exp.is_current}
                      onChange={e => updateExp(i, 'end_date', e.target.value)} className={smallInputClass} /></div>
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={exp.is_current}
                    onChange={e => updateExp(i, 'is_current', e.target.checked)}
                    className="accent-teal-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Currently working here</span>
                </label>
                <div className="mt-3">
                  <label className="text-xs text-gray-500 mb-1 block">Description (What did you do?)</label>
                  <textarea placeholder="Describe your responsibilities and achievements..." rows={3}
                    value={exp.description} onChange={e => updateExp(i, 'description', e.target.value)}
                    className={smallInputClass + " resize-none"} />
                </div>
              </div>
            ))}
            <button onClick={addExp}
              className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-500 text-gray-400 hover:text-teal-500 py-4 rounded-2xl font-medium transition-all">
              + Add Experience
            </button>
          </div>
        )}

        {/* ── STEP 5: Education ── */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Education</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Your educational background</p>

            {profile.education.map((edu, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-gray-900 dark:text-white">Education {i + 1}</span>
                  <button onClick={() => removeEdu(i)} className="text-red-400 hover:text-red-500 text-sm">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Institution *</label>
                    <input placeholder="e.g. Karunya University" value={edu.institution}
                      onChange={e => updateEdu(i, 'institution', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Degree *</label>
                    <input placeholder="e.g. B.Tech, M.Tech" value={edu.degree}
                      onChange={e => updateEdu(i, 'degree', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Field of Study *</label>
                    <input placeholder="e.g. Computer Science" value={edu.field_of_study}
                      onChange={e => updateEdu(i, 'field_of_study', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Start Year</label>
                    <input type="number" placeholder="2020" value={edu.start_year}
                      onChange={e => updateEdu(i, 'start_year', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">End Year</label>
                    <input type="number" placeholder="2024" value={edu.end_year}
                      onChange={e => updateEdu(i, 'end_year', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Grade/CGPA</label>
                    <input placeholder="e.g. 8.5 CGPA" value={edu.grade}
                      onChange={e => updateEdu(i, 'grade', e.target.value)} className={smallInputClass} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Institution Tier</label>
                    <select value={edu.tier} onChange={e => updateEdu(i, 'tier', e.target.value)}
                      className={smallInputClass}>
                      <option value="unknown">Unknown</option>
                      <option value="tier_1">Tier 1 (IIT/NIT/BITS)</option>
                      <option value="tier_2">Tier 2</option>
                      <option value="tier_3">Tier 3</option>
                      <option value="tier_4">Tier 4</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addEdu}
              className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-500 text-gray-400 hover:text-teal-500 py-4 rounded-2xl font-medium transition-all">
              + Add Education
            </button>
          </div>
        )}

        {/* ── STEP 6: More (Certs, Languages, Projects) ── */}
        {step === 6 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">More Details</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Certifications, languages and projects</p>

            {/* Certifications */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📜 Certifications</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input placeholder="Certification name" value={certInput.name}
                  onChange={e => setCertInput({ ...certInput, name: e.target.value })}
                  className={smallInputClass} />
                <input placeholder="Issuer (e.g. Google)" value={certInput.issuer}
                  onChange={e => setCertInput({ ...certInput, issuer: e.target.value })}
                  className={smallInputClass} />
                <input type="number" placeholder="Year" value={certInput.year}
                  onChange={e => setCertInput({ ...certInput, year: e.target.value })}
                  className={smallInputClass} />
                <input placeholder="Credential URL (optional)" value={certInput.credential_url}
                  onChange={e => setCertInput({ ...certInput, credential_url: e.target.value })}
                  className={smallInputClass} />
              </div>
              <button onClick={addCert}
                className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-all mb-3">
                + Add Certification
              </button>
              <div className="space-y-2">
                {profile.certifications.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
                    <span className="text-sm text-purple-700 dark:text-purple-400">{c.name} — {c.issuer} ({c.year})</span>
                    <button onClick={() => removeCert(i)} className="text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🌐 Languages</h3>
              <div className="flex gap-2 mb-2">
                <input placeholder="Language (e.g. Tamil)" value={langInput.language}
                  onChange={e => setLangInput({ ...langInput, language: e.target.value })}
                  className={smallInputClass} />
                <select value={langInput.proficiency}
                  onChange={e => setLangInput({ ...langInput, proficiency: e.target.value })}
                  className={smallInputClass}>
                  <option value="basic">Basic</option>
                  <option value="conversational">Conversational</option>
                  <option value="professional">Professional</option>
                  <option value="native">Native</option>
                </select>
                <button onClick={addLang}
                  className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((l, i) => (
                  <span key={i} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-sm">
                    {l.language} ({l.proficiency})
                    <button onClick={() => removeLang(i)} className="text-red-400 text-xs">✕</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🚀 Projects</h3>
              {profile.projects.map((p, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Project {i + 1}</span>
                    <button onClick={() => removeProject(i)} className="text-red-400 text-xs">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Project title" value={p.title}
                      onChange={e => updateProject(i, 'title', e.target.value)} className={smallInputClass} />
                    <input placeholder="Year" value={p.year}
                      onChange={e => updateProject(i, 'year', e.target.value)} className={smallInputClass} />
                    <input placeholder="Tech stack (e.g. Python, React)" value={p.tech_stack}
                      onChange={e => updateProject(i, 'tech_stack', e.target.value)} className={smallInputClass} />
                    <input placeholder="GitHub/Live URL" value={p.url}
                      onChange={e => updateProject(i, 'url', e.target.value)} className={smallInputClass} />
                    <textarea placeholder="Project description" rows={2} value={p.description}
                      onChange={e => updateProject(i, 'description', e.target.value)}
                      className={smallInputClass + " col-span-2 resize-none"} />
                  </div>
                </div>
              ))}
              <button onClick={addProject}
                className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-500 text-gray-400 hover:text-teal-500 py-3 rounded-xl text-sm font-medium transition-all">
                + Add Project
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 7: Review ── */}
        {step === 7 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Review Your Profile</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Everything looks good? Save your profile!</p>

            <div className="space-y-4">
              {[
                { title: 'Basic Info', items: [
                  `Name: ${localStorage.getItem('name')}`,
                  `Headline: ${profile.headline || 'Not set'}`,
                  `Location: ${profile.location}, ${profile.country}`,
                  `LinkedIn: ${profile.linkedin_url || 'Not set'}`,
                  `GitHub: ${profile.github_url || 'Not set'}`,
                ]},
                { title: 'Job Preferences', items: [
                  `Current Role: ${profile.current_title || 'Not set'}`,
                  `Preferred Role: ${profile.preferred_role || 'Not set'}`,
                  `Experience: ${profile.years_of_experience} years`,
                  `Salary: ₹${profile.expected_salary_min}L - ₹${profile.expected_salary_max}L`,
                  `Work Mode: ${profile.preferred_work_mode}`,
                  `Notice Period: ${profile.notice_period_days} days`,
                  `Open to Work: ${profile.open_to_work ? 'Yes ✅' : 'No'}`,
                ]},
                { title: `Skills (${profile.skills.length})`, items: profile.skills.map(s => `${s.name} — ${s.proficiency}`) },
                { title: `Experience (${profile.experience.length} entries)`, items: profile.experience.map(e => `${e.title} at ${e.company}`) },
                { title: `Education (${profile.education.length} entries)`, items: profile.education.map(e => `${e.degree} from ${e.institution}`) },
                { title: `Certifications (${profile.certifications.length})`, items: profile.certifications.map(c => c.name) },
                { title: `Languages (${profile.languages.length})`, items: profile.languages.map(l => `${l.language} — ${l.proficiency}`) },
                { title: `Projects (${profile.projects.length})`, items: profile.projects.map(p => p.title) },
              ].map((section, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{section.title}</h3>
                  {section.items.length > 0 ? (
                    <ul className="space-y-1">
                      {section.items.map((item, j) => (
                        <li key={j} className="text-sm text-gray-500 dark:text-gray-400">• {item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">Nothing added</p>
                  )}
                </div>
              ))}
            </div>

            {saved && (
              <div className="mt-4 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 px-4 py-3 rounded-xl text-center font-medium">
                ✅ Profile saved! Redirecting to dashboard...
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/jobseeker/dashboard')}
            className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 rounded-xl font-medium transition-all">
            ← Back
          </button>
          {step < 7 ? (
            <button onClick={() => setStep(step + 1)}
              className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 rounded-xl font-semibold transition-all">
              Next →
            </button>
          ) : (
            <button onClick={saveProfile} disabled={loading}
              className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white px-8 py-3 rounded-xl font-semibold transition-all">
              {loading ? 'Saving...' : '💾 Save Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
