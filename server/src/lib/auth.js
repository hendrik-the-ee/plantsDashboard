import { clerkMiddleware, getAuth, requireAuth as clerkRequireAuth } from '@clerk/express';
import { CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY } from '../env.js';

export { clerkMiddleware, clerkRequireAuth as requireAuth };

export function getUserId(req) {
  const { userId } = getAuth(req);
  return userId ?? null;
}

export function clerkOptions() {
  return {
    publishableKey: CLERK_PUBLISHABLE_KEY,
    secretKey: CLERK_SECRET_KEY,
  };
}
