import type { ReactNode } from 'react'
import { QueryProvider } from '@/providers/query'
import { Toaster } from 'sonner'

export const metadata = { title: 'Constellation', description: 'GPU Task Orchestrator' }

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
      <QueryProvider>{children}</QueryProvider>
      <Toaster position="top-right" richColors />
    </body>
  </html>
)

export default RootLayout
