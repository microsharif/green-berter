import AuditLog from "../models/AuditLog.js";

/**
 * Best-effort audit write for admin actions. Never throws into the request
 * path — a failed audit row should not fail the underlying operation.
 *
 * Note: `actorUserId` in the schema is an ObjectId ref to User. Admins are a
 * separate collection, so we record the admin id there for traceability and
 * stamp `metadata.actorType: "admin"` to disambiguate.
 */
export async function writeAdminAudit(req, {
  entityType,
  entityId,
  action,
  previousState = null,
  newState = null,
  metadata = {},
}) {
  try {
    await AuditLog.create({
      entityType,
      entityId,
      action,
      actorUserId: req.admin?._id ?? null,
      ipAddress: req.ip ?? "",
      userAgent: req.get?.("user-agent") ?? "",
      previousState,
      newState,
      metadata: {
        actorType: "admin",
        actorEmail: req.admin?.email ?? null,
        actorRole: req.admin?.role ?? null,
        ...metadata,
      },
    });
  } catch (err) {
    console.error("Failed to write admin audit log:", err?.message ?? err);
  }
}
