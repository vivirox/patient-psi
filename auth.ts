import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { z } from 'zod'
import { getStringFromBuffer } from './lib/utils'
import { getUser } from './app/login/actions'
import { headers } from 'next/headers';

export async function auth() {
  return null
}

export const { auth: nextAuth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            participantId: z.string()
          })
          .safeParse(credentials)

        if (parsedCredentials.success) {
          const { participantId } = parsedCredentials.data;
          const user = await getUser(participantId);
          if (!user) return null
          return user;
        }

        return null
      }
    })
  ]
})
