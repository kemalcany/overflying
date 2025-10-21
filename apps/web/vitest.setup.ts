import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

beforeAll(() => {
  // Use env var from CI or default to localhost for local development
  if (!process.env.NEXT_PUBLIC_API_URL) process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})
