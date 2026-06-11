import Session from "../models/Session.js";
import { SESSION_TTL_MS } from "../config/session.js";

/**
 * Create a new server-side session for `userId`. Returns the persisted doc.
 * DFD §1 step 1/2: "create server session" → D1.
 */
export async function issueSession({ userId, userAgent = "", ipAddress = "" }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  return Session.create({
    userId,
    userAgent,
    ipAddress,
    expiresAt,
    lastActivityAt: now,
    createdAt: now,
  });
}

/**
 * Load a non-expired session by its opaque id.
 * Used by §3 (Session & protected routes) — included for completeness.
 */
export async function findActiveSession(sessionId) {
  if (!sessionId) return null;
  const session = await Session.findById(sessionId);
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await session.deleteOne();
    return null;
  }
  return session;
}

/**
 * Destroy a session (logout / forced revocation).
 */
export async function destroySession(sessionId) {
  if (!sessionId) return;
  await Session.deleteOne({ _id: sessionId });
}

/**
 * Revoke every session for a user (account deletion / admin ban).
 */
export async function destroyAllSessionsForUser(userId) {
  if (!userId) return;
  await Session.deleteMany({ userId });
}
