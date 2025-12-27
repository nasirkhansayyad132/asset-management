import crypto from "crypto";
import { config } from "../config";

export const buildSignature = (assetId: string, timestamp: string) => {
  const payload = `${assetId}|${timestamp}|${config.ministryCode}`;
  return crypto.createHmac("sha256", config.qrSecret).update(payload).digest("hex");
};

export const buildQrPayload = (assetId: string, timestamp: string) => {
  const signature = buildSignature(assetId, timestamp);
  return `${assetId}|${timestamp}|${signature}`;
};

export const verifySignature = (assetId: string, timestamp: string, sig: string) => {
  const expected = buildSignature(assetId, timestamp);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(sig, "hex");
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

export const parseQrPayload = (payload: string) => {
  const [assetId, timestamp, sig] = payload.split("|");
  if (!assetId || !timestamp || !sig) {
    return null;
  }
  return { assetId, timestamp, sig };
};
