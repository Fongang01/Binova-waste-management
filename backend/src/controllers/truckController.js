import * as truckService from "../services/truckService.js";

export async function createTruck(req, res, next) {
  try {
    const truck = await truckService.createTruck(req.body);
    res.status(201).json({ success: true, data: truck });
  } catch (err) {
    next(err);
  }
}

export async function listTrucks(req, res, next) {
  try {
    const data = await truckService.listTrucks();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getTruck(req, res, next) {
  try {
    const truck = await truckService.getTruck(req.params.id);
    if (!truck) return res.status(404).json({ success: false, message: "Truck not found" });
    res.json({ success: true, data: truck });
  } catch (err) {
    next(err);
  }
}

export async function updateTruck(req, res, next) {
  try {
    const truck = await truckService.updateTruck(req.params.id, req.body);
    res.json({ success: true, data: truck });
  } catch (err) {
    next(err);
  }
}

export async function setTruckStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status required" });
    const truck = await truckService.setTruckStatus(req.params.id, status);
    res.json({ success: true, data: truck });
  } catch (err) {
    next(err);
  }
}

export async function deleteTruck(req, res, next) {
  try {
    await truckService.deleteTruck(req.params.id);
    res.json({ success: true, message: "Truck deleted" });
  } catch (err) {
    next(err);
  }
}
