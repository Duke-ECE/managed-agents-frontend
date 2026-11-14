import { lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './components/AuthProvider'
import DashboardLayout from './layouts/DashboardLayout'
import LoginPage from './pages/login/LoginPage'
import LandingPage from './pages/landing/LandingPage'
import NotFoundPage from './pages/not-found/NotFoundPage'
import { useTheme } from './hooks/useTheme'
import { API_GUIDE_URL } from './lib/navigation'

// Route-level code splitting: the authenticated pages (and their heavy deps,
// e.g. react-markdown on the chat page) load as separate chunks. Login stays
// eager — it is the sign-in page. The Suspense boundary lives in
// DashboardLayout around the <Outlet />.
const SessionList = lazy(() => import('./pages/sessions/SessionList'))
const HomePage = lazy(() => import('./pages/home/HomePage'))
const ChatPage = lazy(() => import('./pages/chat/ChatPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const AgentsPage = lazy(() => import('./pages/agents/AgentsPage'))
const APIKeysPage = lazy(() => import('./pages/keys/APIKeysPage'))

function AppRoutes() {
  const { theme, selectTheme } = useTheme()
  const { pathname, search } = useLocation()
  const legacyDocs = pathname === '/keys' && new URLSearchParams(search).get('tab') === 'docs'

  useEffect(() => {
    if (legacyDocs) window.location.replace(API_GUIDE_URL)
  }, [legacyDocs])

  if (legacyDocs) return <main className="app-canvas flex min-h-screen items-center justify-center p-6 text-[13px] text-ink-300">
    Opening the <a className="ml-1 text-accent underline" href={API_GUIDE_URL}>API guide</a>…
  </main>

  return <Routes>
    <Route path="/" element={<LandingPage page="home" />} />
    <Route path="/how-it-works" element={<LandingPage page="how-it-works" />} />
    <Route path="/capabilities" element={<LandingPage page="capabilities" />} />
    <Route path="/docs" element={<LandingPage page="docs" />} />
    <Route path="/login" element={<LoginPage />} />
    <Route
      element={
        <RequireAuth>
          <DashboardLayout theme={theme} onSelectTheme={selectTheme} />
        </RequireAuth>
      }
    >
      <Route path="/sessions" element={<SessionList />} />
      <Route path="/console" element={<HomePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/chat/:id" element={<ChatPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/agents" element={<AgentsPage />} />
      <Route path="/keys" element={<APIKeysPage />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
