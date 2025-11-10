// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Protected } from './components/Protected' // <-- CORREÇÃO AQUI!
import Login from './pages/Login'
import Aluno from './pages/Aluno'
import Professor from './pages/Professor'
import Gestor from './pages/Gestor'
import LandingPage from './pages/LandingPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfUsePage from './pages/TermsOfUsePage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfUsePage />} />

        <Route
          path="/aluno"
          element={
            <Protected roles={['aluno']}>
              <Aluno />
            </Protected>
          }
        />
        <Route
          path="/professor"
          element={
            <Protected roles={['professor']}>
              <Professor />
            </Protected>
          }
        />
        <Route
          path="/gestor"
          element={
            <Protected roles={['gestor']}>
              <Gestor />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
