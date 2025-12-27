import { Router } from "express";
import { prisma } from "../db";
import { requireRoles } from "../middleware/roles";
import { Role, AssetEventType } from "@prisma/client";
import { parseQrPayload, verifySignature } from "../utils/qr";
import { computeInventoryReport } from "../utils/inventory";
import { createAssetEvent } from "../utils/assetEvents";
import { logAudit } from "../utils/audit";

const router = Router();

router.post("/sessions", requireRoles(Role.ADMIN, Role.INVENTORY), async (req, res) => {
  const { location } = req.body as { location?: string };
  if (!location) {
    return res.status(400).json({ error: "location is required" });
  }

  const session = await prisma.inventorySession.create({
    data: {
      location,
      startedBy: req.user!.id
    }
  });

  await logAudit({
    actorUserId: req.user!.id,
    action: "INVENTORY_SESSION_STARTED",
    entityType: "InventorySession",
    entityId: session.id,
    metaJson: { location }
  });

  return res.status(201).json(session);
});

router.post(
  "/sessions/:id/scan",
  requireRoles(Role.ADMIN, Role.INVENTORY),
  async (req, res) => {
    const { assetId, payload } = req.body as { assetId?: string; payload?: string };
    let resolvedAssetId = assetId;

    if (!resolvedAssetId && payload) {
      const parsed = parseQrPayload(payload);
      if (!parsed) {
        return res.status(400).json({ error: "Invalid QR payload" });
      }
      const valid = verifySignature(parsed.assetId, parsed.timestamp, parsed.sig);
      if (!valid) {
        return res.status(400).json({ error: "Invalid QR signature" });
      }
      resolvedAssetId = parsed.assetId;
    }

    if (!resolvedAssetId) {
      return res.status(400).json({ error: "assetId or payload is required" });
    }

    const asset = await prisma.asset.findUnique({ where: { id: resolvedAssetId } });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const session = await prisma.inventorySession.findUnique({
      where: { id: req.params.id }
    });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const existing = await prisma.inventoryScan.findFirst({
      where: { sessionId: session.id, assetId: asset.id }
    });

    const scan =
      existing ??
      (await prisma.inventoryScan.create({
        data: {
          sessionId: session.id,
          assetId: asset.id,
          scannedBy: req.user!.id
        }
      }));

    if (!existing) {
      await createAssetEvent({
        assetId: asset.id,
        type: AssetEventType.VERIFIED,
        actorUserId: req.user!.id,
        metaJson: { sessionId: session.id }
      });
    }

    await logAudit({
      actorUserId: req.user!.id,
      action: "INVENTORY_SCAN",
      entityType: "InventorySession",
      entityId: session.id,
      metaJson: { assetId: asset.id }
    });

    return res.status(201).json(scan);
  }
);

router.get(
  "/sessions/:id/report",
  requireRoles(Role.ADMIN, Role.INVENTORY, Role.AUDITOR),
  async (req, res) => {
    const session = await prisma.inventorySession.findUnique({
      where: { id: req.params.id }
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const expectedAssets = await prisma.asset.findMany({
      where: { location: session.location },
      select: {
        id: true,
        assetTag: true,
        location: true,
        category: true,
        model: true,
        serialNumber: true
      }
    });

    const scans = await prisma.inventoryScan.findMany({
      where: { sessionId: session.id },
      select: { assetId: true }
    });

    const scannedAssets = await prisma.asset.findMany({
      where: { id: { in: scans.map((scan) => scan.assetId) } },
      select: {
        id: true,
        assetTag: true,
        location: true,
        category: true,
        model: true,
        serialNumber: true
      }
    });

    const allAssets = [...expectedAssets];
    for (const asset of scannedAssets) {
      if (!allAssets.find((item) => item.id === asset.id)) {
        allAssets.push(asset);
      }
    }

    const report = computeInventoryReport(session.location, allAssets, scans);

    await logAudit({
      actorUserId: req.user!.id,
      action: "INVENTORY_REPORT_VIEWED",
      entityType: "InventorySession",
      entityId: session.id
    });

    return res.json({
      session,
      verifiedCount: report.verifiedCount,
      missing: report.missing,
      unexpected: report.unexpected
    });
  }
);

export default router;
