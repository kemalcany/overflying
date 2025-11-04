import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {authApi} from '../authApi.ts';
import {authenticatedFetch} from '../authenticatedFetch.ts';
import {useAuthStore} from '@/store/authStore.ts';

// Import the mocked authApi

// Mock the auth API
vi.mock('../authApi.ts', () => ({
  authApi: {
    refresh: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('authenticatedFetch', () => {
  const TEST_URL = 'https://api.example.com/test';
  let mockSetAuth: ReturnType<typeof vi.fn>;
  let mockClearAuth: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockClear();
    vi.mocked(authApi.refresh).mockClear();

    // Suppress console.error in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockSetAuth = vi.fn();
    mockClearAuth = vi.fn();

    // Mock the auth store
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: null,
      isAuthenticated: true,
      isLoading: false,
      setAuth: mockSetAuth,
      clearAuth: mockClearAuth,
      setLoading: vi.fn(),
      updateUser: vi.fn(),
      getUserInitials: vi.fn(() => 'U'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('adds authorization header to requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({data: 'success'}),
      });

      await authenticatedFetch(TEST_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );

      const callHeaders = mockFetch.mock.calls[0]?.[1]?.headers;
      expect(callHeaders.get('Authorization')).toBe('Bearer mock-access-token');
    });

    it('works without access token', async () => {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        setAuth: mockSetAuth,
        clearAuth: mockClearAuth,
        setLoading: vi.fn(),
        updateUser: vi.fn(),
        getUserInitials: vi.fn(() => 'U'),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({data: 'success'}),
      });

      await authenticatedFetch(TEST_URL);

      expect(mockFetch).toHaveBeenCalledWith(TEST_URL, {});
    });

    it('preserves existing headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({data: 'success'}),
      });

      await authenticatedFetch(TEST_URL, {
        headers: {'X-Custom-Header': 'custom-value'},
      });

      const callHeaders = mockFetch.mock.calls[0]?.[1]?.headers;
      expect(callHeaders.get('Authorization')).toBe('Bearer mock-access-token');
      expect(callHeaders.get('X-Custom-Header')).toBe('custom-value');
    });
  });

  describe('token refresh on 401', () => {
    it('automatically refreshes token and retries on 401', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      // Mock successful refresh
      vi.mocked(authApi.refresh).mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
          },
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });

      // Retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({data: 'success'}),
      });

      const response = await authenticatedFetch(TEST_URL);

      // Should have made 2 fetch calls: original + retry
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Should have called refresh
      expect(authApi.refresh).toHaveBeenCalledWith('mock-refresh-token');

      // Should have updated auth store
      expect(mockSetAuth).toHaveBeenCalledWith(
        expect.objectContaining({email: 'test@example.com'}),
        'new-access-token',
        'new-refresh-token',
      );

      // Should return successful response
      expect(response.ok).toBe(true);
    });

    it('prevents multiple simultaneous refresh requests', async () => {
      // First two calls return 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });

      // Mock successful refresh
      vi.mocked(authApi.refresh).mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
          },
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });

      // Retry calls succeed
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({data: 'success'}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({data: 'success'}),
        });

      // Make two simultaneous requests
      await Promise.all([
        authenticatedFetch(TEST_URL),
        authenticatedFetch(TEST_URL),
      ]);

      // Should only call refresh once (both requests wait for same refresh)
      expect(authApi.refresh).toHaveBeenCalledTimes(1);
    });

    it('clears auth when refresh fails', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      // Mock failed refresh
      vi.mocked(authApi.refresh).mockRejectedValueOnce(
        new Error('Refresh token expired'),
      );

      // Should not throw, just return the 401 response
      const response = await authenticatedFetch(TEST_URL);

      // Should have cleared auth
      expect(mockClearAuth).toHaveBeenCalled();

      // Should return the original 401 response
      expect(response.status).toBe(401);
    });

    it('redirects to login when refresh fails (browser)', async () => {
      // Mock window.location
      const originalLocation = window.location;
      const mockLocation = {...originalLocation, href: ''};

      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
        configurable: true,
      });

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      // Mock failed refresh
      vi.mocked(authApi.refresh).mockRejectedValueOnce(
        new Error('Refresh token expired'),
      );

      await authenticatedFetch(TEST_URL);

      // Should redirect to login
      expect(mockLocation.href).toBe('/login');

      // Restore window.location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('handles refresh with no refresh token', async () => {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        accessToken: 'mock-access-token',
        refreshToken: null,
        user: null,
        isAuthenticated: true,
        isLoading: false,
        setAuth: mockSetAuth,
        clearAuth: mockClearAuth,
        setLoading: vi.fn(),
        updateUser: vi.fn(),
        getUserInitials: vi.fn(() => 'U'),
      });

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const response = await authenticatedFetch(TEST_URL);

      // Should not attempt refresh
      expect(authApi.refresh).not.toHaveBeenCalled();

      // Should return 401 response
      expect(response.status).toBe(401);
    });

    it('handles unsuccessful refresh response', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      // Mock unsuccessful refresh (no data)
      vi.mocked(authApi.refresh).mockResolvedValueOnce({
        success: false,
        message: 'Refresh token invalid',
      });

      await authenticatedFetch(TEST_URL);

      // Should have cleared auth
      expect(mockClearAuth).toHaveBeenCalled();

      // Should not have updated auth
      expect(mockSetAuth).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('propagates network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authenticatedFetch(TEST_URL)).rejects.toThrow(
        'Network error',
      );
    });

    it('returns non-401 error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const response = await authenticatedFetch(TEST_URL);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(authApi.refresh).not.toHaveBeenCalled();
    });
  });
});
