import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { signToken } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ id: user.id, role: user.role, email: user.email });

  await logAudit({
    actorUserId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    metaJson: { email: user.email }
  });

  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role }
  });
});

export default router;
