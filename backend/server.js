import express from "express";
import cors from "cors";
import "dotenv/config";
import prisma from "./src/config/prisma.js";
import authRoutes from "./src/routes/authRoutes.js";
import driverRoutes from "./src/routes/driverRoutes.js";
import truckRoutes from "./src/routes/truckRoutes.js";
import binRoutes from "./src/routes/binRoutes.js";
import collectionTaskRoutes from "./src/routes/collectionTaskRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import sensorRoutes from "./src/routes/sensorRoutes.js";
import driverTaskRoutes from "./src/routes/driverTaskRoutes.js";
import errorHandler from "./src/middleware/errorMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "BINOVA backend is running!" }));

app.get("/api/health", async (req, res) => {
  try {
    // basic db check
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: "BINOVA backend is healthy" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database unreachable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/bins", binRoutes);
app.use("/api/collection-tasks", collectionTaskRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/driver/tasks", driverTaskRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
// Log registered routes for debug
if (app._router && app._router.stack) {
  const routes = [];
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
      routes.push({ path: r.route.path, methods: r.route.methods });
    } else if (r.name === 'router' && r.handle && r.handle.stack) {
      r.handle.stack.forEach((s) => {
        if (s.route && s.route.path) routes.push({ path: s.route.path, methods: s.route.methods });
      });
    }
  });
  console.log('Registered routes:', routes.map(r => r.path).join(', '));
}

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`BINOVA backend running on http://${HOST}:${PORT}`);
});