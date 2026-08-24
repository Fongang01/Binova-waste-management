import express from "express";
import * as truckController from "../controllers/truckController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate, requireRole("ADMIN"));

router.post("/", truckController.createTruck);
router.get("/", truckController.listTrucks);
router.get("/:id", truckController.getTruck);
router.put("/:id", truckController.updateTruck);
router.patch("/:id/status", truckController.setTruckStatus);
router.delete("/:id", truckController.deleteTruck);

export default router;
