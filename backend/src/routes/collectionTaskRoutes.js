import express from "express";
import * as taskController from "../controllers/collectionTaskController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// ADMIN routes
router.use(authenticate, requireRole("ADMIN"));
router.post("/", taskController.createTask);
router.get("/", taskController.listTasks);
router.get("/:id", taskController.getTask);
router.put("/:id", taskController.updateTask);
router.patch("/:id/status", taskController.setTaskStatus);
router.delete("/:id", taskController.deleteTask);

export default router;
