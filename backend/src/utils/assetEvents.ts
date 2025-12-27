import { prisma } from "../db";
import type { AssetEventType, Prisma } from "@prisma/client";

const normalizeJson = (value?: Prisma.InputJsonValue) => {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
};

export const createAssetEvent = async (params: {
  assetId: string;
  type: AssetEventType;
  actorUserId: string;
  metaJson?: Prisma.InputJsonValue;
}) => {
  const { assetId, type, actorUserId, metaJson } = params;
  if (!type) {
    return;
  }
  await prisma.assetEvent.create({
    data: {
      assetId,
      type,
      actorUserId,
      metaJson: normalizeJson(metaJson)
    }
  });
};
