import { Router } from "express";
import { listCategories, getCategory } from "../controllers/category.controller.js";

const router = Router();

/**
 * Public read — the upload page is auth-gated client-side, but the
 * categories themselves are not sensitive data and are also useful for
 * filtered browse pages.
 */
router.get("/", listCategories);
router.get("/:id", getCategory);

export default router;
