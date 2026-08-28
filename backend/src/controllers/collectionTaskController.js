import * as taskService from "../services/collectionTaskService.js";

export async function createTask(req, res, next) {
  try {
    const task = await taskService.createTask(req.body);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

export async function listTasks(req, res, next) {
  try {
    const tasks = await taskService.listTasks(req.query);
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
}

export async function getTask(req, res, next) {
  try {
    const task = await taskService.getTask(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req, res, next) {
  try {
    const task = await taskService.updateTask(req.params.id, req.body);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

export async function setTaskStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status required" });
    const task = await taskService.setTaskStatus(req.params.id, status);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const task = await taskService.deleteTask(req.params.id, req.user);
    res.json({ success: true, message: "Collection task deleted successfully", data: task });
  } catch (err) {
    next(err);
  }
}

