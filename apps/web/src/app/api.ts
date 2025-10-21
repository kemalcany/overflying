import type { components, paths } from '../../../../packages/shared-types/ts'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

type JobCreate = components['schemas']['JobCreate']
type JobUpdate = components['schemas']['JobUpdate']
type JobResponse = components['schemas']['JobResponse']
type JobsResponse = paths['/jobs']['get']['responses']['200']['content']['application/json']

export const api = {
  getJobs: async (): Promise<JobsResponse> => fetch(`${API_URL}/jobs`).then((r) => r.json() as Promise<JobsResponse>),

  getJob: async (id: string): Promise<JobResponse> => fetch(`${API_URL}/jobs/${id}`).then((r) => r.json() as Promise<JobResponse>),

  createJob: async (data: JobCreate): Promise<JobResponse> =>
    fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json() as Promise<JobResponse>),

  updateJob: async (id: string, data: JobUpdate): Promise<JobResponse> =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => {
      if (!r.ok) throw new Error(`Failed to update job: ${r.statusText}`)
      return r.json() as Promise<JobResponse>
    }),

  deleteJob: async (id: string): Promise<void> =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'DELETE',
    }).then((r) => {
      if (!r.ok) throw new Error(`Failed to delete job: ${r.statusText}`)
      return undefined
    }),
}

export const connectWebSocket = (onMessage: (job: JobResponse) => void) => {
  const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/ws`)
  ws.onmessage = (event) => onMessage(JSON.parse(event.data))
  return ws
}
