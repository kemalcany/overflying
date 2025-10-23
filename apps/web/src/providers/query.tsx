'use client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';
import {useState} from 'react';

export const QueryProvider = ({children}: {children: ReactNode}) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {queries: {refetchOnWindowFocus: false}},
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
