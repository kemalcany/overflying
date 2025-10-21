import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

beforeAll(() => {
  // Set environment variables before any tests run
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})
