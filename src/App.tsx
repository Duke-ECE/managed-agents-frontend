import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/dashboard/Dashboard'
import SandboxList from './pages/sandboxes/SandboxList'
import SandboxDetail from './pages/sandboxes/SandboxDetail'
import AgentList from './pages/agents/AgentList'
import AgentDetail from './pages/agents/AgentDetail'
import SessionList from './pages/sessions/SessionList'
import SessionDetail from './pages/sessions/SessionDetail'
import TaskList from './pages/tasks/TaskList'
import OrchestrationList from './pages/orchestrations/OrchestrationList'
import OrchestrationDetail from './pages/orchestrations/OrchestrationDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sandboxes" element={<SandboxList />} />
          <Route path="/sandboxes/:id" element={<SandboxDetail />} />
          <Route path="/agents" element={<AgentList />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/sessions" element={<SessionList />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/orchestrations" element={<OrchestrationList />} />
          <Route path="/orchestrations/:id" element={<OrchestrationDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
