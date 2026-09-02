import * as aiPlanningService from "../services/aiPlanningService.js";

export async function getRecommendation(req, res, next) {
  try {
    const plan = await aiPlanningService.generatePlan(req.body || {});
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}

export async function approvePlan(req, res, next) {
  try {
    const result = await aiPlanningService.approveAndCreateTasks(req.body || {}, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
