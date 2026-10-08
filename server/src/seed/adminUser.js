import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import Admin from "../models/Admin.js";
import { isValidRole } from "../config/rbac.js";

/**
 * Seeds (or updates) the first super administrator from environment vars.
 *
 *   ADMIN_SEED_EMAIL      required
 *   ADMIN_SEED_PASSWORD   required (>= 8 chars)
 *   ADMIN_SEED_NAME       optional (default "Super Admin")
 *   ADMIN_SEED_ROLE       optional (default "super_admin")
 *
 * Idempotent: re-running updates the password/role/name on the existing row
 * rather than creating duplicates. Run with `npm run seed:admin`.
 */
async function seedAdmin() {
  const email = (process.env.ADMIN_SEED_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD ?? "";
  const fullName = (process.env.ADMIN_SEED_NAME ?? "Super Admin").trim();
  const role = (process.env.ADMIN_SEED_ROLE ?? "super_admin").trim();

  if (!email || !password) {
    console.error(
      "Missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD in environment."
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_SEED_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }
  if (!isValidRole(role)) {
    console.error(`ADMIN_SEED_ROLE "${role}" is not a valid admin role.`);
    process.exit(1);
  }

  await connectDatabase(process.env.MONGODB_URI);
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);

  let admin = await Admin.findOne({ email }).select("+passwordHash");
  if (admin) {
    admin.fullName = fullName;
    admin.role = role;
    admin.status = "active";
    admin.password = password;
    await admin.save();
    console.log(`Updated existing admin: ${email} (${role})`);
  } else {
    admin = new Admin({ email, fullName, role, status: "active" });
    admin.password = password;
    await admin.save();
    console.log(`Created admin: ${email} (${role})`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch(async (err) => {
  console.error("Failed to seed admin:", err?.message ?? err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
