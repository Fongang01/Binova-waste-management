import express from "express";
import { summary } from "../controllers/dashboardController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/summary", authenticate, requireRole("ADMIN"), summary);

export default router;
