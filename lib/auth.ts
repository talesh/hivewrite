import NextAuth, { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import type { SessionUser } from '@/types';

// Validate environment variables at startup
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const nextAuthUrl = process.env.NEXTAUTH_URL;

if (!githubClientId || !githubClientSecret) {
  throw new Error('Missing required GitHub OAuth configuration (GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)');
}

if (!nextAuthSecret) {
  throw new Error('Missing required NEXTAUTH_SECRET environment variable');
}

if (!nextAuthUrl) {
  console.warn('NEXTAUTH_URL not set - using default. Set this in production!');
}

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      authorization: {
        params: {
          scope: 'read:user user:email repo workflow',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the GitHub access token and user info
      if (account && profile) {
        token.accessToken = account.access_token;
        token.username = profile.login;
        token.avatar = (profile as any).avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client (DO NOT send accessToken - keep it server-side only)
      if (session.user) {
        (session.user as any).username = token.username;
        (session.user as any).avatar = token.avatar;
        // SECURITY: Access token is kept in JWT (server-side) only, never sent to client
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnTranslatePage = nextUrl.pathname.includes('/translate');
      const isOnAdminPage = nextUrl.pathname.includes('/admin');

      // Protected routes require authentication
      if ((isOnTranslatePage || isOnAdminPage) && !isLoggedIn) {
        return false;
      }

      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Helper function to get session user (WITHOUT access token)
export async function getSessionUser(): Promise<Omit<SessionUser, 'accessToken'> | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const user = session.user as any;

  return {
    username: user.username || user.email?.split('@')[0] || 'unknown',
    name: user.name || null,
    email: user.email || null,
    avatar: user.avatar || user.image || '',
  };
}

// SERVER-SIDE ONLY: Get access token from encrypted JWT
// This should NEVER be called from client components or exposed to the client
export async function getServerAccessToken(): Promise<string | null> {
  try {
    // Get the JWT token from the encrypted cookie (server-side only)
    const token = await getToken({
      req: {
        headers: Object.fromEntries((await cookies()).entries()) as any,
        cookies: Object.fromEntries((await cookies()).entries()) as any,
      } as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.accessToken) {
      return null;
    }

    return token.accessToken as string;
  } catch (error) {
    console.error('Failed to get server access token:', error);
    return null;
  }
}

// Helper to check if user is authenticated
export async function requireAuth(): Promise<Omit<SessionUser, 'accessToken'>> {
  const user = await getSessionUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

// Helper to get user WITH access token (server-side only)
export async function requireAuthWithToken(): Promise<SessionUser> {
  const user = await requireAuth();
  const accessToken = await getServerAccessToken();

  if (!accessToken) {
    throw new Error('Access token not available');
  }

  return {
    ...user,
    accessToken,
  };
}
