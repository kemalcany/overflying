import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {api} from '../api.ts';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Use the environment variable that's set in vitest.setup.ts
const TEST_API_URL = process.env.NEXT_PUBLIC_API_URL!;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getJobs', () => {
    it('fetches jobs from the API', async () => {
      const mockJobs = [
        {
          id: '1',
          name: 'Job 1',
          priority: 1,
          state: 'queued',
          created_at: '2025-01-01',
        },
        {
          id: '2',
          name: 'Job 2',
          priority: 2,
          state: 'running',
          created_at: '2025-01-02',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobs,
      });

      const result = await api.getJobs();

      expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/jobs`);
      expect(result).toEqual(mockJobs);
    });
  });

  describe('getJob', () => {
    it('fetches a single job by ID', async () => {
      const mockJob = {
        id: '123',
        name: 'Test Job',
        priority: 5,
        state: 'queued',
        created_at: '2025-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJob,
      });

      const result = await api.getJob('123');

      expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/jobs/123`);
      expect(result).toEqual(mockJob);
    });
  });

  describe('createJob', () => {
    it('creates a new job', async () => {
      const jobData = {name: 'New Job', priority: 10, params: {}};
      const mockResponse = {
        id: '456',
        ...jobData,
        state: 'queued',
        created_at: '2025-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createJob(jobData);

      expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/jobs`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(jobData),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateJob', () => {
    it('updates an existing job', async () => {
      const jobId = '789';
      const updateData = {name: 'Updated Name', priority: 20};
      const mockResponse = {
        id: jobId,
        ...updateData,
        state: 'queued',
        created_at: '2025-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateJob(jobId, updateData);

      expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/jobs/789`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws error when update fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(api.updateJob('999', {name: 'Updated'})).rejects.toThrow(
        'Failed to update job: Not Found',
      );
    });
  });

  describe('deleteJob', () => {
    it('deletes a job', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await api.deleteJob('123');

      expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/jobs/123`, {
        method: 'DELETE',
      });
      expect(result).toBeUndefined();
    });

    it('throws error when delete fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(api.deleteJob('999')).rejects.toThrow(
        'Failed to delete job: Not Found',
      );
    });

    it('handles 404 error for non-existent job', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(api.deleteJob('nonexistent')).rejects.toThrow('Not Found');
    });
  });

  describe('error handling', () => {
    it('handles network errors in getJobs', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getJobs()).rejects.toThrow('Network error');
    });

    it('handles network errors in createJob', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        api.createJob({name: 'Test', priority: 1, params: {}}),
      ).rejects.toThrow('Network error');
    });
  });

  describe('partial updates', () => {
    it('allows updating only name', async () => {
      const mockResponse = {
        id: '1',
        name: 'New Name',
        priority: 5,
        state: 'queued',
        created_at: '2025-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await api.updateJob('1', {name: 'New Name'});

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1].body);
      expect(callBody).toEqual({name: 'New Name'});
    });

    it('allows updating only priority', async () => {
      const mockResponse = {
        id: '1',
        name: 'Test',
        priority: 100,
        state: 'queued',
        created_at: '2025-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await api.updateJob('1', {priority: 100});

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1].body);
      expect(callBody).toEqual({priority: 100});
    });
  });
});
