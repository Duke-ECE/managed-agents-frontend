import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './components/AuthProvider'
import DashboardLayout from './layouts/DashboardLayout'
import LoginPage from './pages/login/LoginPage'

// Route-level code splitting: the authenticated pages (and their heavy deps,
// e.g. react-markdown on the chat page) load as separate chunks. Login stays
// eager — it is the landing page. The Suspense boundary lives in
// DashboardLayout around the <Outlet />.
const SessionList = lazy(() => import('./pages/sessions/SessionList'))
const ChatPage = lazy(() => import('./pages/chat/ChatPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/sessions" element={<SessionList />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
