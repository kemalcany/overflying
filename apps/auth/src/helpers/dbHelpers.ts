import { Pool } from 'postgres'

export interface User {
  id: string
  email: string
  password_hash: string
  name: string | null
  role: string
  current_hashed_refresh_token: string | null
  created_at: Date
  updated_at: Date
}

export interface UserResponse
  extends Omit<User, 'password_hash' | 'current_hashed_refresh_token'> {}

export const connectToPostgres = (databaseUrl: string) => {
  const pool = new Pool(databaseUrl, 3, true)
  return pool
}

export const getUserByEmail = async (pool: Pool, email: string): Promise<User | null> => {
  const connection = await pool.connect()
  try {
    const result = await connection.queryObject<User>(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email.trim().toLowerCase()],
    )
    return result.rows[0] || null
  } finally {
    connection.release()
  }
}

export const getUserById = async (pool: Pool, id: string): Promise<User | null> => {
  const connection = await pool.connect()
  try {
    const result = await connection.queryObject<User>(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [id],
    )
    return result.rows[0] || null
  } finally {
    connection.release()
  }
}

export const updateUserRefreshToken = async (
  pool: Pool,
  userId: string,
  hashedRefreshToken: string,
): Promise<void> => {
  const connection = await pool.connect()
  try {
    await connection.queryObject(
      'UPDATE users SET current_hashed_refresh_token = $1, updated_at = now() WHERE id = $2',
      [hashedRefreshToken, userId],
    )
  } finally {
    connection.release()
  }
}

export const prepareUserResponse = (user: User): UserResponse => {
  const {
    password_hash: _password_hash,
    current_hashed_refresh_token: _current_hashed_refresh_token,
    ...userResponse
  } = user
  return userResponse
}
