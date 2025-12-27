import { prisma } from "../db";
import type { Prisma } from "@prisma/client";

const normalizeJson = (value?: Prisma.InputJsonValue) => {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
};

export const logAudit = async (params: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metaJson?: Prisma.InputJsonValue;
}) => {
  const { actorUserId, action, entityType, entityId, metaJson } = params;
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId: entityId ?? null,
      metaJson: normalizeJson(metaJson)
    }
  });
};
