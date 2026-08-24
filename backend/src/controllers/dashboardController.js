import * as dashboardService from "../services/dashboardService.js";

export async function summary(req, res, next) {
  try {
    const data = await dashboardService.getSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
