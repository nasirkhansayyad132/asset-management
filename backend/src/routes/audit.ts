import { Router } from "express";
import { prisma } from "../db";
import { requireRoles } from "../middleware/roles";
import { Role } from "@prisma/client";
import { toCsv } from "../utils/csv";

const router = Router();

const buildFilters = (query: {
  action?: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
}) => {
  const { action, actorUserId, entityType, entityId, from, to } = query;
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) {
    createdAt.gte = new Date(from);
  }
  if (to) {
    createdAt.lte = new Date(to);
  }

  return {
    ...(action ? { action } : {}),
    ...(actorUserId ? { actorUserId } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {})
  };
};

router.get("/", requireRoles(Role.ADMIN, Role.AUDITOR), async (req, res) => {
  const { limit, offset, action, actorUserId, entityType, entityId, from, to } =
    req.query as {
      limit?: string;
      offset?: string;
      action?: string;
      actorUserId?: string;
      entityType?: string;
      entityId?: string;
      from?: string;
      to?: string;
    };

  const logs = await prisma.auditLog.findMany({
    where: buildFilters({ action, actorUserId, entityType, entityId, from, to }),
    orderBy: { createdAt: "desc" },
    take: limit ? Number(limit) : 50,
    skip: offset ? Number(offset) : 0,
    include: { actor: true }
  });

  return res.json(logs);
});

router.get(
  "/export.csv",
  requireRoles(Role.ADMIN, Role.AUDITOR),
  async (req, res) => {
    const { action, actorUserId, entityType, entityId, from, to } = req.query as {
      action?: string;
      actorUserId?: string;
      entityType?: string;
      entityId?: string;
      from?: string;
      to?: string;
    };

    const logs = await prisma.auditLog.findMany({
      where: buildFilters({ action, actorUserId, entityType, entityId, from, to }),
      orderBy: { createdAt: "desc" }
    });

    const rows = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      actorUserId: log.actorUserId,
      createdAt: log.createdAt.toISOString(),
      metaJson: log.metaJson ? JSON.stringify(log.metaJson) : ""
    }));

    const csv = toCsv(rows);
    res.header("Content-Type", "text/csv");
    res.attachment("audit-export.csv");
    return res.send(csv);
  }
);

export default router;
