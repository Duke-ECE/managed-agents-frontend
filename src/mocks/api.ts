import {
  sandboxes, agents, sessions, tasks, orchestrations,
  activities, dashboardStats, tokenUsageTrend, taskCompletionTrend,
} from './data'
import type {
  Sandbox, Agent, Session, Task, Orchestration,
  ActivityEvent, DashboardStats, UsagePoint,
} from '../types'

const delay = (ms = 350) => new Promise<void>(r => setTimeout(r, ms))

export const api = {
  async getSandboxes(): Promise<Sandbox[]> {
    await delay()
    return sandboxes
  },
  async getSandbox(id: string): Promise<Sandbox | undefined> {
    await delay()
    return sandboxes.find(s => s.id === id)
  },
  async getAgents(): Promise<Agent[]> {
    await delay()
    return agents
  },
  async getAgent(id: string): Promise<Agent | undefined> {
    await delay()
    return agents.find(a => a.id === id)
  },
  async getSessions(): Promise<Session[]> {
    await delay()
    return sessions
  },
  async getSession(id: string): Promise<Session | undefined> {
    await delay()
    return sessions.find(s => s.id === id)
  },
  async getTasks(): Promise<Task[]> {
    await delay()
    return tasks
  },
  async getOrchestrations(): Promise<Orchestration[]> {
    await delay()
    return orchestrations
  },
  async getOrchestration(id: string): Promise<Orchestration | undefined> {
    await delay()
    return orchestrations.find(o => o.id === id)
  },
  async getActivities(): Promise<ActivityEvent[]> {
    await delay()
    return activities
  },
  async getDashboardStats(): Promise<DashboardStats> {
    await delay(200)
    return dashboardStats
  },
  async getTokenUsageTrend(): Promise<UsagePoint[]> {
    await delay(200)
    return tokenUsageTrend
  },
  async getTaskCompletionTrend(): Promise<UsagePoint[]> {
    await delay(200)
    return taskCompletionTrend
  },
}
