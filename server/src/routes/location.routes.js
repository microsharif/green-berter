import { Router } from "express";
import {
  getLocation,
  listLocations,
} from "../controllers/location.controller.js";

const router = Router();

router.get("/", listLocations);
router.get("/:id", getLocation);

export default router;
