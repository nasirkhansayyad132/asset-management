import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { requireRoles } from "../middleware/roles";
import { logAudit } from "../utils/audit";
import { Role } from "@prisma/client";

const router = Router();

router.get("/", requireRoles(Role.ADMIN), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true }
  });
  return res.json(users);
});

router.post("/", requireRoles(Role.ADMIN), async (req, res) => {
  const { email, password, role } = req.body as {
    email?: string;
    password?: string;
    role?: Role;
  };

  if (!email || !password || !role) {
    return res.status(400).json({ error: "email, password, and role are required" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, role }
  });

  await logAudit({
    actorUserId: req.user!.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    metaJson: { email, role }
  });

  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

export default router;
