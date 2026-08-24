import express from "express";
import { createReading } from "../controllers/sensorController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Allow sensors to post without auth in future; for now require ADMIN
router.post("/readings", authenticate, requireRole("ADMIN"), createReading);

export default router;
