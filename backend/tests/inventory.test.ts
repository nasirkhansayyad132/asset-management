import { describe, expect, it } from "vitest";
import { computeInventoryReport } from "../src/utils/inventory";

describe("Inventory report", () => {
  it("computes verified, missing, and unexpected assets", () => {
    const assets = [
      {
        id: "a1",
        assetTag: "TAG-001",
        location: "HQ",
        category: "Laptop",
        model: null,
        serialNumber: null
      },
      {
        id: "a2",
        assetTag: "TAG-002",
        location: "HQ",
        category: "Printer",
        model: null,
        serialNumber: null
      },
      {
        id: "b1",
        assetTag: "TAG-003",
        location: "Field",
        category: "Desktop",
        model: null,
        serialNumber: null
      }
    ];

    const scans = [{ assetId: "a1" }, { assetId: "b1" }];

    const report = computeInventoryReport("HQ", assets, scans);

    expect(report.verifiedCount).toBe(1);
    expect(report.missing).toHaveLength(1);
    expect(report.missing[0].id).toBe("a2");
    expect(report.unexpected).toHaveLength(1);
    expect(report.unexpected[0].id).toBe("b1");
  });
});
