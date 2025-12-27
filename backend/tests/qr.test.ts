import { beforeAll, describe, expect, it } from "vitest";

let buildSignature: (assetId: string, timestamp: string) => string;
let verifySignature: (assetId: string, timestamp: string, sig: string) => boolean;

beforeAll(async () => {
  process.env.QR_SECRET = "test_secret";
  process.env.MINISTRY_CODE = "MOHE";
  const qr = await import("../src/utils/qr");
  buildSignature = qr.buildSignature;
  verifySignature = qr.verifySignature;
});

describe("QR signature", () => {
  it("verifies valid signatures", () => {
    const assetId = "asset-123";
    const timestamp = "1700000000";
    const sig = buildSignature(assetId, timestamp);
    expect(verifySignature(assetId, timestamp, sig)).toBe(true);
  });

  it("rejects invalid signatures", () => {
    const assetId = "asset-123";
    const timestamp = "1700000000";
    expect(verifySignature(assetId, timestamp, "deadbeef")).toBe(false);
  });
});
