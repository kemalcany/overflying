'use client';

import {usePathname, useRouter} from 'next/navigation';
import {type ReactNode, useEffect} from 'react';
import {authApi} from '@/lib/authApi.ts';
import {useAuthStore} from '@/store/authStore.ts';

interface AuthProviderProps {
  children: ReactNode;
}

const PUBLIC_ROUTES = ['/login', '/'];

export function AuthProvider({children}: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    accessToken,
    refreshToken,
    setAuth,
    clearAuth,
    setLoading,
  } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);

      // If on a public route, skip auth check
      if (PUBLIC_ROUTES.includes(pathname)) {
        // If authenticated user tries to access public route, redirect to /jobs
        if (isAuthenticated && accessToken && pathname === '/') {
          setLoading(false);
          router.push('/jobs');
          return;
        }
        // Not authenticated, allow access to public route
        setLoading(false);
        return;
      }

      // If not authenticated and not on public route, redirect to login
      if (!isAuthenticated || !accessToken) {
        setLoading(false);
        router.push('/login');
        return;
      }

      // Try to validate the access token by calling /me
      try {
        const response = await authApi.me(accessToken);
        if (response.success && response.data) {
          // Token is valid, update user data
          setAuth(response.data.user, accessToken, refreshToken || '');
          setLoading(false);
        }
      } catch {
        // Access token is invalid, try to refresh
        if (refreshToken) {
          try {
            const refreshResponse = await authApi.refresh(refreshToken);
            if (refreshResponse.success && refreshResponse.data) {
              setAuth(
                refreshResponse.data.user,
                refreshResponse.data.accessToken,
                refreshResponse.data.refreshToken,
              );
              setLoading(false);
              return;
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }

        // Both access and refresh failed, clear auth and redirect
        clearAuth();
        setLoading(false);
        router.push('/login');
      }
    };

    initAuth();
  }, [
    pathname,
    isAuthenticated,
    accessToken,
    refreshToken,
    router,
    setAuth,
    clearAuth,
    setLoading,
  ]);

  return <>{children}</>;
}
