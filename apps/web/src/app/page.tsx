'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // TODO: Check authentication from proper auth provider
    // console.log('TODO: Check auth - localStorage.getItem(isAuthenticated)');
    // For now, redirect to login for static export
    router.push('/login');
  }, [router]);

  return null;
}
