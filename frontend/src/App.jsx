import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import JobSeekerDashboard from './pages/JobSeekerDashboard'
import RecruiterDashboard from './pages/RecruiterDashboard'
import ProfileBuilder from './pages/ProfileBuilder'
import RankCandidates from './pages/RankCandidates'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/jobseeker/dashboard" element={<JobSeekerDashboard />} />
        <Route path="/jobseeker/profile" element={<ProfileBuilder />} />
        <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
        <Route path="/recruiter/rank" element={<RankCandidates />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App