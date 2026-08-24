import * as driverService from "../services/driverService.js";

export async function createDriver(req, res, next) {
  try {
    const user = await driverService.createDriver(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function listDrivers(req, res, next) {
  try {
    const users = await driverService.listDrivers();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

export async function getDriver(req, res, next) {
  try {
    const user = await driverService.getDriver(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Driver not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateDriver(req, res, next) {
  try {
    const user = await driverService.updateDriver(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function setDriverStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status is required" });
    const user = await driverService.setDriverStatus(req.params.id, status);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
