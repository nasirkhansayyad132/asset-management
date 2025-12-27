import express from "express";
import cors from "cors";
import type { Request, Response, NextFunction } from "express";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import assetRoutes from "./routes/assets";
import requestRoutes from "./routes/requests";
import scanRoutes from "./routes/scan";
import maintenanceRoutes from "./routes/maintenance";
import inventoryRoutes from "./routes/inventory";
import auditRoutes from "./routes/audit";
import aiRoutes from "./routes/ai";
import { requireAuth } from "./middleware/auth";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);

app.use(requireAuth);
app.use("/users", userRoutes);
app.use("/assets", assetRoutes);
app.use("/requests", requestRoutes);
app.use("/scan", scanRoutes);
app.use("/", maintenanceRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/audit", auditRoutes);
app.use("/ai", aiRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message === "Unsupported file type") {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: "Server error" });
});

export default app;
