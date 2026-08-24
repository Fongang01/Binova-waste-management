import express from "express";
import * as driverController from "../controllers/driverController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate, requireRole("ADMIN"));

router.post("/", driverController.createDriver);
router.get("/", driverController.listDrivers);
router.get("/:id", driverController.getDriver);
router.put("/:id", driverController.updateDriver);
router.patch("/:id/status", driverController.setDriverStatus);

export default router;
