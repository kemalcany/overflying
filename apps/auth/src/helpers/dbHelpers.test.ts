import { assertEquals } from '@std/assert'
import { prepareUserResponse } from './dbHelpers.ts'
import type { User } from './dbHelpers.ts'

Deno.test('prepareUserResponse removes sensitive fields', () => {
  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    name: 'Test User',
    role: 'user',
    current_hashed_refresh_token: 'hashed_token',
    created_at: new Date(),
    updated_at: new Date(),
  }

  const result = prepareUserResponse(mockUser)

  assertEquals(result.id, mockUser.id)
  assertEquals(result.email, mockUser.email)
  assertEquals(result.name, mockUser.name)
  // @ts-expect-error - password_hash should not exist on UserResponse
  assertEquals(result.password_hash, undefined)
  // @ts-expect-error - current_hashed_refresh_token should not exist on UserResponse
  assertEquals(result.current_hashed_refresh_token, undefined)
})
