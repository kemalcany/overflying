import type {ReactNode} from 'react';
import {Toaster} from 'sonner';
import {AuthProvider} from '@/providers/auth';
import {EmotionCacheProvider} from '@/providers/emotion';
import {QueryProvider} from '@/providers/query';

export const metadata = {
  title: 'Overfly.ing',
  description: 'GPU Task Orchestrator',
};

const RootLayout = ({children}: {children: ReactNode}) => (
  <html lang="en">
    <body
      style={{
        margin: 0,
        fontFamily: 'system-ui, sans-serif',
        // background: '#000000',
        background: '#ffffff',
      }}
    >
      <EmotionCacheProvider>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </EmotionCacheProvider>
    </body>
  </html>
);

export default RootLayout;
