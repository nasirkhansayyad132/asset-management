import { Router } from "express";
import { prisma } from "../db";
import { requireRoles } from "../middleware/roles";
import {
  Role,
  RequestStatus,
  RequestType,
  AssetEventType,
  AssetStatus
} from "@prisma/client";
import { createAssetEvent } from "../utils/assetEvents";
import { logAudit } from "../utils/audit";

const router = Router();

const requestStatusValues = new Set(Object.values(RequestStatus));
const requestTypeValues = new Set(Object.values(RequestType));

const normalizeQueryValue = (value: unknown) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseRequestStatus = (value: unknown): RequestStatus | null => {
  const normalized = normalizeQueryValue(value);
  if (!normalized) {
    return null;
  }
  const upper = normalized.toUpperCase();
  return requestStatusValues.has(upper as RequestStatus)
    ? (upper as RequestStatus)
    : null;
};

const parseRequestType = (value: unknown): RequestType | null => {
  const normalized = normalizeQueryValue(value);
  if (!normalized) {
    return null;
  }
  const upper = normalized.toUpperCase();
  return requestTypeValues.has(upper as RequestType) ? (upper as RequestType) : null;
};

router.get(
  "/",
  requireRoles(Role.ADMIN, Role.APPROVER, Role.STORE_CLERK),
  async (req, res) => {
    const status = parseRequestStatus(req.query.status);
    if (req.query.status !== undefined && status === null) {
      return res.status(400).json({ error: "Invalid status filter" });
    }

    const type = parseRequestType(req.query.type);
    if (req.query.type !== undefined && type === null) {
      return res.status(400).json({ error: "Invalid type filter" });
    }

    const requests = await prisma.request.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {})
      },
      include: { asset: true, requester: true, approver: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json(requests);
  }
);

router.post(
  "/:requestId/approve",
  requireRoles(Role.ADMIN, Role.APPROVER),
  async (req, res) => {
    const request = await prisma.request.findUnique({
      where: { id: req.params.requestId },
      include: { asset: true }
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== RequestStatus.PENDING) {
      return res.status(400).json({ error: "Request is not pending" });
    }

    const asset = request.asset;
    let eventType: AssetEventType;
    let assetUpdate: { status: AssetStatus; custodian?: string | null };

    switch (request.type) {
      case RequestType.ASSIGN:
        if (asset.status === AssetStatus.UNDER_MAINTENANCE) {
          return res.status(400).json({ error: "Asset is under maintenance" });
        }
        if (asset.status === AssetStatus.DISPOSED) {
          return res.status(400).json({ error: "Asset is disposed" });
        }
        if (asset.custodian) {
          return res.status(409).json({ error: "Asset is already assigned" });
        }
        eventType = AssetEventType.ASSIGNED;
        assetUpdate = {
          status: AssetStatus.ASSIGNED,
          custodian: request.toCustodian
        };
        break;
      case RequestType.TRANSFER:
        if (asset.status !== AssetStatus.ASSIGNED) {
          return res.status(400).json({ error: "Asset is not assigned" });
        }
        if (!asset.custodian) {
          return res
            .status(400)
            .json({ error: "Asset has no custodian to transfer" });
        }
        if (request.fromCustodian && asset.custodian !== request.fromCustodian) {
          return res.status(409).json({
            error: "Asset custodian changed since request was created"
          });
        }
        eventType = AssetEventType.TRANSFERRED;
        assetUpdate = {
          status: AssetStatus.ASSIGNED,
          custodian: request.toCustodian
        };
        break;
      case RequestType.DISPOSE:
        if (asset.status === AssetStatus.UNDER_MAINTENANCE) {
          return res.status(400).json({ error: "Asset is under maintenance" });
        }
        if (asset.status === AssetStatus.DISPOSED) {
          return res.status(409).json({ error: "Asset is already disposed" });
        }
        eventType = AssetEventType.DISPOSED;
        assetUpdate = {
          status: AssetStatus.DISPOSED,
          custodian: null
        };
        break;
      default:
        return res.status(400).json({ error: "Unsupported request type" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.request.update({
        where: { id: request.id },
        data: {
          status: RequestStatus.APPROVED,
          approvedBy: req.user!.id
        }
      });

      const updatedAsset = await tx.asset.update({
        where: { id: request.assetId },
        data: assetUpdate
      });

      return { updatedRequest, updatedAsset };
    });

    await createAssetEvent({
      assetId: result.updatedAsset.id,
      type: eventType,
      actorUserId: req.user!.id,
      metaJson: { requestId: request.id, toCustodian: request.toCustodian }
    });

    await logAudit({
      actorUserId: req.user!.id,
      action: "REQUEST_APPROVED",
      entityType: "Request",
      entityId: request.id,
      metaJson: { assetId: request.assetId, type: request.type }
    });

    return res.json(result.updatedRequest);
  }
);

router.post(
  "/:requestId/reject",
  requireRoles(Role.ADMIN, Role.APPROVER),
  async (req, res) => {
    const request = await prisma.request.findUnique({
      where: { id: req.params.requestId }
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== RequestStatus.PENDING) {
      return res.status(400).json({ error: "Request is not pending" });
    }

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.REJECTED,
        approvedBy: req.user!.id
      }
    });

    await logAudit({
      actorUserId: req.user!.id,
      action: "REQUEST_REJECTED",
      entityType: "Request",
      entityId: request.id,
      metaJson: { assetId: request.assetId, type: request.type }
    });

    return res.json(updated);
  }
);

export default router;
