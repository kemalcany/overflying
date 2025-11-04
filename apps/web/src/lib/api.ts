import {
  authenticatedDelete,
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
} from './authenticatedFetch.ts';
import type {components, paths} from '@/generated/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type JobCreate = components['schemas']['JobCreate'];
type JobUpdate = components['schemas']['JobUpdate'];
type JobResponse = components['schemas']['JobResponse'];
type JobsResponse =
  paths['/jobs']['get']['responses']['200']['content']['application/json'];

export const api = {
  getJobs: async (): Promise<JobsResponse> =>
    authenticatedGet<JobsResponse>(`${API_URL}/jobs`),

  getJob: async (id: string): Promise<JobResponse> =>
    authenticatedGet<JobResponse>(`${API_URL}/jobs/${id}`),

  createJob: async (data: JobCreate): Promise<JobResponse> =>
    authenticatedPost<JobResponse>(`${API_URL}/jobs`, data),

  updateJob: async (id: string, data: JobUpdate): Promise<JobResponse> =>
    authenticatedPut<JobResponse>(`${API_URL}/jobs/${id}`, data),

  deleteJob: async (id: string): Promise<void> =>
    authenticatedDelete(`${API_URL}/jobs/${id}`),
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
