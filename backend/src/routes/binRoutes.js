import express from "express";
import * as binController from "../controllers/binController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

// List & Read (Accessible by authenticated users: ADMIN and DRIVER)
router.get("/", binController.listBins);
router.get("/:id", binController.getBin);

// Write & Mutate (Admin only)
router.post("/", requireRole("ADMIN"), binController.createBin);
router.put("/:id", requireRole("ADMIN"), binController.updateBin);
router.patch("/:id/status", requireRole("ADMIN"), binController.setBinStatus);
router.delete("/:id", requireRole("ADMIN"), binController.deleteBin);

export default router;
