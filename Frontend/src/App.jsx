import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './admin/AuthContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import ProtectedRoute from './admin/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import Models from './pages/Models.jsx'
import Projects from './pages/Projects.jsx'
import Contact from './pages/Contact.jsx'
import Login from './admin/Login.jsx'
import Dashboard from './admin/Dashboard.jsx'
import ModelsList from './admin/ModelsList.jsx'
import ModelForm from './admin/ModelForm.jsx'
import SoftwareList from './admin/SoftwareList.jsx'
import StatsEditor from './admin/StatsEditor.jsx'
import ProjectsList from './admin/ProjectsList.jsx'

const guard = (el) => <ProtectedRoute>{el}</ProtectedRoute>

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/models" element={<Models />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={guard(<Dashboard />)} />
            <Route path="/admin/models" element={guard(<ModelsList />)} />
            <Route path="/admin/models/new" element={guard(<ModelForm />)} />
            <Route path="/admin/models/:id" element={guard(<ModelForm />)} />
            <Route path="/admin/software" element={guard(<SoftwareList />)} />
            <Route path="/admin/stats" element={guard(<StatsEditor />)} />
            <Route path="/admin/projects" element={guard(<ProjectsList />)} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
