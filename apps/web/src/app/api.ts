import type { components, paths } from '../../../../packages/shared-types/ts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Job = components['schemas']['Job']
type JobCreate = components['schemas']['JobCreate']
type JobsResponse = paths['/jobs']['get']['responses']['200']['content']['application/json']

export const api = {
  getJobs: async (): Promise<JobsResponse> => fetch(`${API_URL}/jobs`).then((r) => r.json() as Promise<JobsResponse>),
  getJob: async (id: string): Promise<Job> => fetch(`${API_URL}/jobs/${id}`).then((r) => r.json() as Promise<Job>),
  createJob: async (data: JobCreate): Promise<Job> =>
    fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json() as Promise<Job>),
  updateJob: async (id: string, data: Partial<JobCreate>): Promise<Job> =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => {
      if (!r.ok) throw new Error(`Failed to update job: ${r.statusText}`)
      return r.json() as Promise<Job>
    }),
  deleteJob: async (id: string): Promise<void> =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'DELETE',
    }).then((r) => {
      if (!r.ok) throw new Error(`Failed to delete job: ${r.statusText}`)
      return undefined
    }),
}

export const connectWebSocket = (onMessage: (job: Job) => void) => {
  const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/ws`)
  ws.onmessage = (event) => onMessage(JSON.parse(event.data))
  return ws
}
