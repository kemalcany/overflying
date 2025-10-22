import type { ReactNode } from 'react'
import { QueryProvider } from '@/providers/query'
import { EmotionCacheProvider } from '@/providers/emotion'
import { Toaster } from 'sonner'

export const metadata = { title: 'Overfly.ing', description: 'GPU Task Orchestrator' }

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
      <EmotionCacheProvider>
        <QueryProvider>{children}</QueryProvider>
        <Toaster position="top-right" richColors />
      </EmotionCacheProvider>
    </body>
  </html>
)

export default RootLayout
