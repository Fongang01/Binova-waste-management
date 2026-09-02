import express from "express";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";
import * as driverTasks from "../controllers/driverTasksController.js";

const router = express.Router();

router.use(authenticate, requireRole("DRIVER"));

router.get("/", driverTasks.listMyTasks);
router.get("/truck", driverTasks.getMyTruck);
router.get("/:id", driverTasks.getMyTask);
router.patch("/:id/status", driverTasks.patchMyTaskStatus);
router.patch("/:id/complete-stop", driverTasks.completeTaskStop);

export default router;
