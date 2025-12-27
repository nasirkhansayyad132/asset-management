import { Router } from "express";
import { prisma } from "../db";
import { requireRoles } from "../middleware/roles";
import { Role, MaintenanceStatus, AssetEventType, AssetStatus, Prisma } from "@prisma/client";
import { createAssetEvent } from "../utils/assetEvents";
import { logAudit } from "../utils/audit";

const router = Router();
const supportsRecommendDisposal = Boolean(
  Prisma.dmmf.datamodel.models
    .find((model) => model.name === "MaintenanceTicket")
    ?.fields.some((field) => field.name === "recommendDisposal")
);

const parseCost = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

router.get(
  "/maintenance",
  requireRoles(Role.ADMIN, Role.MAINTENANCE),
  async (req, res) => {
  const { status, assetId } = req.query as { status?: MaintenanceStatus; assetId?: string };
  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(assetId ? { assetId } : {})
    },
    include: { asset: true },
    orderBy: { openedAt: "desc" }
  });
  return res.json(tickets);
  }
);

router.post(
  "/assets/:id/maintenance",
  requireRoles(Role.ADMIN, Role.MAINTENANCE),
  async (req, res) => {
    const { issue, vendor, cost, notes } = req.body as {
      issue?: string;
      vendor?: string;
      cost?: number;
      notes?: string;
    };
    if (!issue) {
      return res.status(400).json({ error: "issue is required" });
    }

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        assetId: asset.id,
        issue,
        vendor: vendor || null,
        cost: parseCost(cost),
        notes: notes || null,
        openedBy: req.user!.id
      }
    });

    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: AssetStatus.UNDER_MAINTENANCE }
    });

    await createAssetEvent({
      assetId: asset.id,
      type: AssetEventType.MAINTENANCE_OPENED,
      actorUserId: req.user!.id,
      metaJson: { ticketId: ticket.id }
    });

    await logAudit({
      actorUserId: req.user!.id,
      action: "MAINTENANCE_OPENED",
      entityType: "MaintenanceTicket",
      entityId: ticket.id,
      metaJson: { assetId: asset.id }
    });

    return res.status(201).json(ticket);
  }
);

router.patch(
  "/maintenance/:ticketId/close",
  requireRoles(Role.ADMIN, Role.MAINTENANCE),
  async (req, res) => {
    const { notRecoverable } = req.body as { notRecoverable?: boolean | string };
    const markUnrecoverable = notRecoverable === true || notRecoverable === "true";
    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id: req.params.ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.status === MaintenanceStatus.CLOSED) {
      return res.status(400).json({ error: "Ticket already closed" });
    }

    const updateData: Prisma.MaintenanceTicketUpdateInput = {
      status: MaintenanceStatus.CLOSED,
      closedAt: new Date(),
      closer: { connect: { id: req.user!.id } }
    };
    if (supportsRecommendDisposal) {
      const existingRecommend =
        (ticket as { recommendDisposal?: boolean }).recommendDisposal ?? false;
      (updateData as { recommendDisposal?: boolean }).recommendDisposal =
        markUnrecoverable || existingRecommend;
    }

    const updated = await prisma.maintenanceTicket.update({
      where: { id: ticket.id },
      data: updateData
    });

    const openTickets = await prisma.maintenanceTicket.count({
      where: { assetId: ticket.assetId, status: MaintenanceStatus.OPEN }
    });

    if (openTickets === 0) {
      const asset = await prisma.asset.findUnique({ where: { id: ticket.assetId } });
      if (asset) {
        if (markUnrecoverable) {
          await prisma.asset.update({
            where: { id: asset.id },
            data: {
              status: AssetStatus.IN_STORE,
              custodian: null,
              condition: "Beyond repair"
            }
          });
        } else {
          const nextStatus = asset.custodian ? AssetStatus.ASSIGNED : AssetStatus.IN_STORE;
          await prisma.asset.update({
            where: { id: asset.id },
            data: { status: nextStatus }
          });
        }
      }
    }

    await createAssetEvent({
      assetId: ticket.assetId,
      type: AssetEventType.MAINTENANCE_CLOSED,
      actorUserId: req.user!.id,
      metaJson: { ticketId: ticket.id, notRecoverable: markUnrecoverable }
    });

    await logAudit({
      actorUserId: req.user!.id,
      action: "MAINTENANCE_CLOSED",
      entityType: "MaintenanceTicket",
      entityId: ticket.id,
      metaJson: { assetId: ticket.assetId, notRecoverable: markUnrecoverable }
    });

    return res.json(updated);
  }
);

export default router;
