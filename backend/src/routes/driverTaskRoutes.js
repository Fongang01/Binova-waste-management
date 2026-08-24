import express from "express";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";
import * as driverTasks from "../controllers/driverTasksController.js";

const router = express.Router();

router.use(authenticate, requireRole("DRIVER"));

router.get("/", driverTasks.listMyTasks);
router.get("/:id", driverTasks.getMyTask);
router.patch("/:id/status", driverTasks.patchMyTaskStatus);

export default router;
