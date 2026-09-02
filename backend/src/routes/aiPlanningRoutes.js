import express from "express";
import * as aiPlanningController from "../controllers/aiPlanningController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// AI Planning is restricted to ADMIN users
router.use(authenticate, requireRole("ADMIN"));

router.post("/recommend", aiPlanningController.getRecommendation);
router.post("/approve", aiPlanningController.approvePlan);

export default router;
