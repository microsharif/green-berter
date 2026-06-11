import { Router } from "express";
import {
  createUser,
  listUsers,
  getUser,
  getMySettings,
  patchMySettings,
  updateUser,
  removeUser,
} from "../controllers/user.controller.js";
import { loadSession, requireAuth } from "../middleware/session.js";

const router = Router();

/** Public reads — browse profiles / resolve seller cards by id. */
router.get("/", loadSession, listUsers);
router.get("/me/settings", loadSession, requireAuth, getMySettings);
router.patch("/me/settings", loadSession, requireAuth, patchMySettings);
router.get("/:id", loadSession, getUser);

/** Insert — same validation as registration; no session is issued here. */
router.post("/", createUser);

/** Owner-only update / soft-delete. */
router.patch("/:id", loadSession, requireAuth, updateUser);
router.delete("/:id", loadSession, requireAuth, removeUser);

export default router;
