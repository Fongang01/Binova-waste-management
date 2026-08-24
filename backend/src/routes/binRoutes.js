import express from "express";
import * as binController from "../controllers/binController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate, requireRole("ADMIN"));

router.post("/", binController.createBin);
router.get("/", binController.listBins);
router.get("/:id", binController.getBin);
router.put("/:id", binController.updateBin);
router.patch("/:id/status", binController.setBinStatus);
router.delete("/:id", binController.deleteBin);

export default router;
