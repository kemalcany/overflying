import {authApi} from './authApi.ts';
import {useAuthStore} from '@/store/authStore.ts';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Fetch wrapper that automatically handles token refresh on 401 responses
 * This ensures seamless authentication for protected API calls
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const {accessToken, refreshToken, setAuth, clearAuth} =
    useAuthStore.getState();

  // If no access token, don't add authorization header
  if (!accessToken) {
    return fetch(url, options);
  }

  // Add authorization header
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  // Make the initial request
  let response = await fetch(url, {...options, headers});

  // If 401 Unauthorized, try to refresh the token
  if (response.status === 401 && refreshToken) {
    // Prevent multiple simultaneous refresh requests
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const refreshResponse = await authApi.refresh(refreshToken);

          if (refreshResponse.success && refreshResponse.data) {
            const {
              user,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            } = refreshResponse.data;

            // Update the auth store with new tokens
            setAuth(user, newAccessToken, newRefreshToken);

            return newAccessToken;
          } else {
            // Refresh failed, clear auth and redirect to login
            clearAuth();
            throw new Error('Token refresh failed');
          }
        } catch (error) {
          // Refresh failed, clear auth
          clearAuth();
          throw error;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();
    }

    try {
      // Wait for the refresh to complete
      const newAccessToken = await refreshPromise;

      // Retry the original request with the new token
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      response = await fetch(url, {...options, headers});
    } catch (error) {
      // Refresh failed, return the 401 response
      console.error('Token refresh failed:', error);

      // Optionally redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return response;
    }
  }

  return response;
}

/**
 * Convenience wrapper for authenticated GET requests
 */
export async function authenticatedGet<T>(url: string): Promise<T> {
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Convenience wrapper for authenticated POST requests
 */
export async function authenticatedPost<T>(
  url: string,
  data: unknown,
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Convenience wrapper for authenticated PUT requests
 */
export async function authenticatedPut<T>(
  url: string,
  data: unknown,
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Convenience wrapper for authenticated DELETE requests
 */
export async function authenticatedDelete(url: string): Promise<void> {
  const response = await authenticatedFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}
