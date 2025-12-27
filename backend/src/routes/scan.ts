import { Router } from "express";
import { prisma } from "../db";
import { verifySignature } from "../utils/qr";

const router = Router();

router.get("/verify", async (req, res) => {
  const { assetId, timestamp, sig } = req.query as {
    assetId?: string;
    timestamp?: string;
    sig?: string;
  };

  if (!assetId || !timestamp || !sig) {
    return res.status(400).json({ error: "assetId, timestamp, sig are required" });
  }

  const valid = verifySignature(assetId, timestamp, sig);
  if (!valid) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      assetTag: true,
      category: true,
      model: true,
      serialNumber: true,
      location: true,
      status: true,
      custodian: true
    }
  });

  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }

  return res.json({ valid: true, asset });
});

export default router;
