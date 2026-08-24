import * as binService from "../services/binService.js";

export async function createBin(req, res, next) {
  try {
    const bin = await binService.createBin(req.body);
    res.status(201).json({ success: true, data: bin });
  } catch (err) {
    next(err);
  }
}

export async function listBins(req, res, next) {
  try {
    const bins = await binService.listBins(req.query);
    res.json({ success: true, data: bins });
  } catch (err) {
    next(err);
  }
}

export async function getBin(req, res, next) {
  try {
    const bin = await binService.getBin(req.params.id);
    if (!bin) return res.status(404).json({ success: false, message: "Bin not found" });
    res.json({ success: true, data: bin });
  } catch (err) {
    next(err);
  }
}

export async function updateBin(req, res, next) {
  try {
    const bin = await binService.updateBin(req.params.id, req.body);
    res.json({ success: true, data: bin });
  } catch (err) {
    next(err);
  }
}

export async function setBinStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status required" });
    const bin = await binService.setBinStatus(req.params.id, status);
    res.json({ success: true, data: bin });
  } catch (err) {
    next(err);
  }
}

export async function deleteBin(req, res, next) {
  try {
    await binService.deleteBin(req.params.id);
    res.json({ success: true, message: "Bin deleted" });
  } catch (err) {
    next(err);
  }
}
