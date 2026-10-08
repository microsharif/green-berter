import AdminSession from "../models/AdminSession.js";
import { ADMIN_SESSION_TTL_MS } from "../config/adminSession.js";

/**
 * Create a new server-side admin session. Returns the persisted doc.
 */
export async function issueAdminSession({
  adminId,
  userAgent = "",
  ipAddress = "",
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL_MS);
  return AdminSession.create({
    adminId,
    userAgent,
    ipAddress,
    expiresAt,
    lastActivityAt: now,
    createdAt: now,
  });
}

/**
 * Load a non-expired admin session by its opaque id.
 */
export async function findActiveAdminSession(sessionId) {
  if (!sessionId) return null;
  const session = await AdminSession.findById(sessionId);
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await session.deleteOne();
    return null;
  }
  return session;
}

/**
 * Destroy a single admin session (logout / forced revocation).
 */
export async function destroyAdminSession(sessionId) {
  if (!sessionId) return;
  await AdminSession.deleteOne({ _id: sessionId });
}

/**
 * Revoke every session for an admin (disable / password change).
 */
export async function destroyAllSessionsForAdmin(adminId) {
  if (!adminId) return;
  await AdminSession.deleteMany({ adminId });
}
