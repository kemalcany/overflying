import type {ReactNode} from 'react';
import {Toaster} from 'sonner';
import {EmotionCacheProvider} from '@/providers/emotion';
import {QueryProvider} from '@/providers/query';

export const metadata = {
  title: 'Overfly.ing',
  description: 'GPU Task Orchestrator',
};

const RootLayout = ({children}: {children: ReactNode}) => (
  <html lang="en">
    <body style={{margin: 0, fontFamily: 'system-ui, sans-serif'}}>
      <EmotionCacheProvider>
        <QueryProvider>{children}</QueryProvider>
        <Toaster position="top-right" richColors />
      </EmotionCacheProvider>
    </body>
  </html>
);

export default RootLayout;
