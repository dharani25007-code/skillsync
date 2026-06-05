import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function ProfileBuilder() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(true)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState({
    bio: '',
    location: '',
    preferred_role: '',
    skills: [],
    experience: [],
    education: [],
    certifications: [],
  })

  const [skillInput, setSkillInput] = useState('')
  const [certInput, setCertInput] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, skillInput.trim()] })
      setSkillInput('')
    }
  }

  const removeSkill = (s) => {
    setProfile({ ...profile, skills: profile.skills.filter(x => x !== s) })
  }

  const addCert = () => {
    if (certInput.trim()) {
      setProfile({ ...profile, certifications: [...profile.certifications, certInput.trim()] })
      setCertInput('')
    }
  }

  const removeCert = (c) => {
    setProfile({ ...profile, certifications: profile.certifications.filter(x => x !== c) })
  }

  const addExperience = () => {
    setProfile({
      ...profile,
      experience: [...profile.experience, { company: '', role: '', years: '', description: '' }]
    })
  }

  const updateExperience = (i, field, value) => {
    const updated = [...profile.experience]
    updated[i][field] = value
    setProfile({ ...profile, experience: updated })
  }

  const removeExperience = (i) => {
    setProfile({ ...profile, experience: profile.experience.filter((_, idx) => idx !== i) })
  }

  const addEducation = () => {
    setProfile({
      ...profile,
      education: [...profile.education, { institution: '', degree: '', field: '', year: '' }]
    })
  }

  const updateEducation = (i, field, value) => {
    const updated = [...profile.education]
    updated[i][field] = value
    setProfile({ ...profile, education: updated })
  }

  const removeEducation = (i) => {
    setProfile({ ...profile, education: profile.education.filter((_, idx) => idx !== i) })
  }

  const saveProfile = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post('http://127.0.0.1:8000/profile/jobseeker', profile, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSaved(true)
      setTimeout(() => navigate('/jobseeker/dashboard'), 1500)
    } catch (err) {
      alert('Failed to save profile. Please try again.')
    }
    setLoading(false)
  }

  const steps = ['Basic Info', 'Skills', 'Experience', 'Education', 'Review']

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
        <button onClick={() => setDark(!dark)}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-lg">
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i + 1 < step ? 'bg-teal-500 text-white' :
                i + 1 === step ? 'bg-teal-500 text-white ring-4 ring-teal-500/30' :
                'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className={`hidden md:block ml-2 text-sm font-medium ${
                i + 1 === step ? 'text-teal-500' : 'text-gray-400'
              }`}>{s}</span>
              {i < steps.length - 1 && (
                <div className={`w-8 md:w-12 h-0.5 mx-2 ${i + 1 < step ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Basic Info */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Basic Information</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Tell us about yourself</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Preferred Job Role</label>
                <input type="text" placeholder="e.g. Python Developer, Data Scientist"
                  value={profile.preferred_role}
                  onChange={e => setProfile({ ...profile, preferred_role: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Location</label>
                <input type="text" placeholder="e.g. Chennai, Tamil Nadu"
                  value={profile.location}
                  onChange={e => setProfile({ ...profile, location: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Bio</label>
                <textarea placeholder="Tell recruiters about yourself..."
                  value={profile.bio} rows={4}
                  onChange={e => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Skills */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Skills</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Add skills you know — these will be verified by AI exam</p>

            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="e.g. Python, Machine Learning, Flask"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
              <button onClick={addSkill}
                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold transition-all">
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {profile.skills.map((s, i) => (
                <span key={i} className="flex items-center gap-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-full text-sm font-medium">
                  {s}
                  <button onClick={() => removeSkill(s)} className="hover:text-red-500 transition-all">×</button>
                </span>
              ))}
              {profile.skills.length === 0 && (
                <p className="text-gray-400 text-sm">No skills added yet. Type a skill and press Enter or Add.</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Certifications</label>
              <div className="flex gap-2 mb-3">
                <input type="text" placeholder="e.g. AWS Certified, Google ML Certificate"
                  value={certInput}
                  onChange={e => setCertInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCert()}
                  className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
                <button onClick={addCert}
                  className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-semibold transition-all">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.certifications.map((c, i) => (
                  <span key={i} className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-full text-sm font-medium">
                    {c}
                    <button onClick={() => removeCert(c)} className="hover:text-red-500 transition-all">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Experience */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Work Experience</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Add your past work experience</p>

            {profile.experience.map((exp, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-gray-900 dark:text-white">Experience {i + 1}</span>
                  <button onClick={() => removeExperience(i)} className="text-red-400 hover:text-red-500 text-sm">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Company Name" value={exp.company}
                    onChange={e => updateExperience(i, 'company', e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  <input placeholder="Job Role" value={exp.role}
                    onChange={e => updateExperience(i, 'role', e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  <input placeholder="Years (e.g. 2)" value={exp.years}
                    onChange={e => updateExperience(i, 'years', e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  <input placeholder="Short description" value={exp.description}
                    onChange={e => updateExperience(i, 'description', e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
            ))}

            <button onClick={addExperience}
              className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-500 text-gray-400 hover:text-teal-500 py-4 rounded-2xl font-medium transition-all">
              + Add Experience
            </button>
          </div>
        )}

        {/* Step 4 — Education */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Education</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Add your educational background</p>

            {profile.education.map((edu, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-gray-900 dark:text-white">Education {i + 1}</span>
                  <button onClick={() => removeEducation(i)} className="text-red-400 hover:text-red-500 text-sm">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Institution Name" value={edu.institution}
                    onChange={e => updateEducation(i, 'institution', e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  <input placeholder="Degree (e.g. B.Tech)" value={edu.degree}
                    onChange={e => updateEducation(i, 'degree', e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  <input placeholder="Field of Study" value={edu.field}
                    onChange={e => updateEducation(i, 'field', e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                  <input placeholder="Year (e.g. 2024)" value={edu.year}
                    onChange={e => updateEducation(i, 'year', e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
            ))}

            <button onClick={addEducation}
              className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-500 text-gray-400 hover:text-teal-500 py-4 rounded-2xl font-medium transition-all">
              + Add Education
            </button>
          </div>
        )}

        {/* Step 5 — Review */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Review Your Profile</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Everything looks good? Save your profile!</p>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Basic Info</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Role: {profile.preferred_role || 'Not set'}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Location: {profile.location || 'Not set'}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Bio: {profile.bio || 'Not set'}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Skills ({profile.skills.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s, i) => (
                    <span key={i} className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full text-sm">{s}</span>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Experience ({profile.experience.length} entries)</h3>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Education ({profile.education.length} entries)</h3>
                <h3 className="font-semibold text-gray-900 dark:text-white">Certifications ({profile.certifications.length} entries)</h3>
              </div>
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
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/jobseeker/dashboard')}
            className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500 hover:text-teal-500 rounded-xl font-medium transition-all">
            ← Back
          </button>
          {step < 5 ? (
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