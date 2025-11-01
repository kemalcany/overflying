import type {components, paths} from '@/generated/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type JobCreate = components['schemas']['JobCreate'];
type JobUpdate = components['schemas']['JobUpdate'];
type JobResponse = components['schemas']['JobResponse'];
type JobsResponse =
  paths['/jobs']['get']['responses']['200']['content']['application/json'];

export const api = {
  getJobs: async (): Promise<JobsResponse> =>
    fetch(`${API_URL}/jobs`).then(r => r.json() as Promise<JobsResponse>),

  getJob: async (id: string): Promise<JobResponse> =>
    fetch(`${API_URL}/jobs/${id}`).then(r => r.json() as Promise<JobResponse>),

  createJob: async (data: JobCreate): Promise<JobResponse> =>
    fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    }).then(r => r.json() as Promise<JobResponse>),

  updateJob: async (id: string, data: JobUpdate): Promise<JobResponse> =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    }).then(r => {
      if (!r.ok) {
        throw new Error(`Failed to update job: ${r.statusText}`);
      }
      return r.json() as Promise<JobResponse>;
    }),

  deleteJob: async (id: string): Promise<void> =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'DELETE',
    }).then(r => {
      if (!r.ok) {
        throw new Error(`Failed to delete job: ${r.statusText}`);
      }
      return undefined;
    }),
};

/**
 * Connect to SSE endpoint for real-time job updates
 * Returns an EventSource instance that can be closed with .close()
 */
export const connectJobEvents = (
  onMessage: (event: any) => void,
  onError?: (error: Event) => void,
) => {
  const eventSource = new (EventSource as any)(`${API_URL}/events`);

  eventSource.onmessage = (event: any) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
      // eslint-disable-next-line no-console
      console.log('[SSE] Message received:', data);
    } catch (error) {
      console.error('[SSE] Failed to parse event data:', error);
    }
  };

  eventSource.onerror = (error: any) => {
    console.error('[SSE] Connection error:', error);
    if (onError) {
      onError(error);
    }
  };

  eventSource.addEventListener('open', () => {
    // eslint-disable-next-line no-console
    console.log('[SSE] Connection established');
  });

  return eventSource;
};

// Legacy WebSocket function (kept for backward compatibility)
export const connectWebSocket = (onMessage: (_job: JobResponse) => void) => {
  const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/ws`);
  ws.onmessage = event => onMessage(JSON.parse(event.data));
  return ws;
};
