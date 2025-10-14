import type { ReactNode } from 'react'
import { QueryProvider } from '@/providers/query'

export const metadata = { title: 'Constellation', description: 'GPU Task Orchestrator' }

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
      <QueryProvider>{children}</QueryProvider>
    </body>
  </html>
)

export default RootLayout
