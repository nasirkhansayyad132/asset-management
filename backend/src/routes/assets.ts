import { Router } from "express";
import multer from "multer";
import path from "path";
import QRCode from "qrcode";
import { prisma } from "../db";
import { requireRoles } from "../middleware/roles";
import { Role, AssetStatus, AssetEventType } from "@prisma/client";
import { config } from "../config";
import { generateAssetTag } from "../utils/assetTag";
import { createAssetEvent } from "../utils/assetEvents";
import { buildQrPayload } from "../utils/qr";
import { computeSha256, ensureDir, sanitizeFileName } from "../utils/storage";
import { logAudit } from "../utils/audit";

const router = Router();

const parseCost = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toStringValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return undefined;
};

const toNullableString = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return undefined;
};

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, _file, cb) => {
      try {
        const assetId = req.params.id;
        const targetDir = path.join(
          config.storageDir,
          "assets",
          assetId,
          "handover"
        );
        await ensureDir(targetDir);
        cb(null, targetDir);
      } catch (error) {
        cb(error as Error, "");
      }
    },
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const extension = path.extname(file.originalname) || ".bin";
      const safeExtension = sanitizeFileName(extension);
      cb(null, `${timestamp}${safeExtension}`);
    }
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    return cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get("/", async (req, res) => {
  const { status, category, location, custodian } = req.query as {
    status?: AssetStatus;
    category?: string;
    location?: string;
    custodian?: string;
  };

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(location ? { location } : {}),
    ...(custodian ? { custodian } : {})
  };

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });
  return res.json(assets);
});

router.post("/", requireRoles(Role.ADMIN, Role.STORE_CLERK), async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const assetTag = toStringValue(body.assetTag);
  const category = toStringValue(body.category);
  const make = toNullableString(body.make);
  const model = toNullableString(body.model);
  const serialNumber = toNullableString(body.serialNumber);
  const cost = body.cost;
  const vendor = toNullableString(body.vendor);
  const purchaseDate = body.purchaseDate as string | number | Date | undefined;
  const location = toStringValue(body.location);
  const condition = toNullableString(body.condition);
  const custodian = toNullableString(body.custodian);
  const status = body.status as AssetStatus | undefined;

  if (!category || !location) {
    return res.status(400).json({ error: "category and location are required" });
  }

  const tag = assetTag || generateAssetTag();
  const asset = await prisma.asset.create({
    data: {
      assetTag: tag,
      category,
      make: make ?? null,
      model: model ?? null,
      serialNumber: serialNumber ?? null,
      cost: parseCost(cost),
      vendor: vendor ?? null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      location,
      condition: condition ?? null,
      custodian: custodian ?? null,
      status: status || AssetStatus.IN_STORE
    }
  });

  await createAssetEvent({
    assetId: asset.id,
    type: AssetEventType.CREATED,
    actorUserId: req.user!.id,
    metaJson: { assetTag: asset.assetTag }
  });

  await logAudit({
    actorUserId: req.user!.id,
    action: "ASSET_CREATED",
    entityType: "Asset",
    entityId: asset.id,
    metaJson: { assetTag: asset.assetTag }
  });

  return res.status(201).json(asset);
});

router.get("/:id", async (req, res) => {
  const asset = await prisma.asset.findUnique({
    where: { id: req.params.id },
    include: {
      events: { orderBy: { createdAt: "desc" } },
      requests: { orderBy: { createdAt: "desc" } },
      handovers: { orderBy: { uploadedAt: "desc" } },
      maintenanceTickets: { orderBy: { openedAt: "desc" } }
    }
  });
  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }
  return res.json(asset);
});

router.put("/:id", requireRoles(Role.ADMIN, Role.STORE_CLERK), async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const category = toStringValue(body.category);
  const make = toNullableString(body.make);
  const model = toNullableString(body.model);
  const serialNumber = toNullableString(body.serialNumber);
  const cost = body.cost;
  const vendor = toNullableString(body.vendor);
  const purchaseDate = body.purchaseDate as string | number | Date | undefined;
  const location = toStringValue(body.location);
  const condition = toNullableString(body.condition);
  const custodian = toNullableString(body.custodian);
  const status = body.status as AssetStatus | undefined;

  const data = {
    ...(category ? { category } : {}),
    ...(make !== undefined ? { make } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(serialNumber !== undefined ? { serialNumber } : {}),
    ...(cost !== undefined ? { cost: parseCost(cost) } : {}),
    ...(vendor !== undefined ? { vendor } : {}),
    ...(purchaseDate !== undefined
      ? { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }
      : {}),
    ...(location ? { location } : {}),
    ...(condition !== undefined ? { condition } : {}),
    ...(custodian !== undefined ? { custodian } : {}),
    ...(status ? { status } : {})
  };

  const asset = await prisma.asset.update({
    where: { id: req.params.id },
    data
  });

  await createAssetEvent({
    assetId: asset.id,
    type: AssetEventType.UPDATED,
    actorUserId: req.user!.id,
    metaJson: { updates: Object.keys(data) }
  });

  await logAudit({
    actorUserId: req.user!.id,
    action: "ASSET_UPDATED",
    entityType: "Asset",
    entityId: asset.id,
    metaJson: { updates: Object.keys(data) }
  });

  return res.json(asset);
});

router.post(
  "/:id/assign-request",
  requireRoles(Role.ADMIN, Role.STORE_CLERK),
  async (req, res) => {
    const { toCustodian } = req.body as { toCustodian?: string };
    if (!toCustodian) {
      return res.status(400).json({ error: "toCustodian is required" });
    }

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const request = await prisma.request.create({
      data: {
        assetId: asset.id,
        type: "ASSIGN",
        fromCustodian: asset.custodian,
        toCustodian,
        requestedBy: req.user!.id
      }
    });

    await createAssetEvent({
      assetId: asset.id,
      type: AssetEventType.ASSIGN_REQUESTED,
      actorUserId: req.user!.id,
      metaJson: { requestId: request.id, toCustodian }
    });

    await logAudit({
      actorUserId: req.user!.id,
      action: "ASSIGN_REQUEST_CREATED",
      entityType: "Request",
      entityId: request.id,
      metaJson: { assetId: asset.id, toCustodian }
    });

    return res.status(201).json(request);
  }
);

router.post(
  "/:id/transfer-request",
  requireRoles(Role.ADMIN, Role.STORE_CLERK),
  async (req, res) => {
    const { toCustodian } = req.body as { toCustodian?: string };
    if (!toCustodian) {
      return res.status(400).json({ error: "toCustodian is required" });
    }

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const request = await prisma.request.create({
      data: {
        assetId: asset.id,
        type: "TRANSFER",
        fromCustodian: asset.custodian,
        toCustodian,
        requestedBy: req.user!.id
      }
    });

    await createAssetEvent({
      assetId: asset.id,
      type: AssetEventType.TRANSFER_REQUESTED,
      actorUserId: req.user!.id,
      metaJson: { requestId: request.id, toCustodian }
    });

    await logAudit({
      actorUserId: req.user!.id,
      action: "TRANSFER_REQUEST_CREATED",
      entityType: "Request",
      entityId: request.id,
      metaJson: { assetId: asset.id, toCustodian }
    });

    return res.status(201).json(request);
  }
);

router.post(
  "/:id/dispose-request",
  requireRoles(Role.ADMIN, Role.STORE_CLERK),
  async (req, res) => {
    const { reason, toCustodian } = req.body as {
      reason?: string;
      toCustodian?: string;
    };

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const request = await prisma.request.create({
      data: {
        assetId: asset.id,
        type: "DISPOSE",
        fromCustodian: asset.custodian,
        toCustodian: toCustodian || "DISPOSAL",
        requestedBy: req.user!.id
      }
    });

    await createAssetEvent({
      assetId: asset.id,
      type: AssetEventType.DISPOSE_REQUESTED,
      actorUserId: req.user!.id,
      metaJson: { requestId: request.id, reason }
    });

    await logAudit({
      actorUserId: req.user!.id,
      action: "DISPOSE_REQUEST_CREATED",
      entityType: "Request",
      entityId: request.id,
      metaJson: { assetId: asset.id, reason }
    });

    return res.status(201).json(request);
  }
);

router.get("/:id/qr", async (req, res) => {
  const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }

  const timestamp = Date.now().toString();
  const payload = buildQrPayload(asset.id, timestamp);
  const buffer = await QRCode.toBuffer(payload, { type: "png", width: 256 });

  res.type("image/png").send(buffer);
});

router.post(
  "/:id/handover/upload",
  requireRoles(Role.ADMIN, Role.STORE_CLERK),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "file is required" });
    }

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const requestId = req.body.requestId as string | undefined;
    const sha256 = await computeSha256(req.file.path);
    const record = await prisma.handoverDocument.create({
      data: {
        assetId: asset.id,
        requestId: requestId || null,
        filePath: req.file.path,
        sha256,
        uploadedBy: req.user!.id
      }
    });

    await createAssetEvent({
      assetId: asset.id,
      type: AssetEventType.HANDOVER_UPLOADED,
      actorUserId: req.user!.id,
      metaJson: { handoverId: record.id, requestId }
    });

    await logAudit({
      actorUserId: req.user!.id,
      action: "HANDOVER_UPLOADED",
      entityType: "HandoverDocument",
      entityId: record.id,
      metaJson: { assetId: asset.id, requestId, sha256 }
    });

    return res.status(201).json(record);
  }
);

export default router;
