import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './admin/AuthContext.jsx'
import ProtectedRoute from './admin/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import Projects from './pages/Projects.jsx'
import Login from './admin/Login.jsx'
import Dashboard from './admin/Dashboard.jsx'
import ModelsList from './admin/ModelsList.jsx'
import ModelForm from './admin/ModelForm.jsx'
import ProjectsList from './admin/ProjectsList.jsx'
import MessagesList from './admin/MessagesList.jsx'

const guard = (el) => <ProtectedRoute>{el}</ProtectedRoute>

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={guard(<Dashboard />)} />
          <Route path="/admin/models" element={guard(<ModelsList />)} />
          <Route path="/admin/models/new" element={guard(<ModelForm />)} />
          <Route path="/admin/models/:id" element={guard(<ModelForm />)} />
          <Route path="/admin/projects" element={guard(<ProjectsList />)} />
          <Route path="/admin/messages" element={guard(<MessagesList />)} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
