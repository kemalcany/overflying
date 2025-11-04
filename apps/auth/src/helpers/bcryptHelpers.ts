// deno-lint-ignore-file no-explicit-any
import {
  compare as comparePromise,
  compareSync,
  genSaltSync,
  hash as hashPromise,
  hashSync,
} from 'bcrypt'

const isRunningInDenoDeploy = (globalThis as any).Worker === undefined

const hash: typeof hashPromise = isRunningInDenoDeploy
  ? (plaintext: string, salt: string | undefined = undefined) =>
    new Promise((res) => res(hashSync(plaintext, salt)))
  : hashPromise

const compare: typeof comparePromise = isRunningInDenoDeploy
  ? (plaintext: string, hash: string) => new Promise((res) => res(compareSync(plaintext, hash)))
  : comparePromise

export const hashPassword = async (password: string): Promise<string> =>
  await hash(password, genSaltSync(10))

export const hashRefreshToken = async (refreshToken: string): Promise<string> =>
  await hash(refreshToken, genSaltSync(10))

export const comparePlainAndHash = async (
  plaintext: string,
  hashedValue: string,
): Promise<boolean> => await compare(plaintext, hashedValue)
