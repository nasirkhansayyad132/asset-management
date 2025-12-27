type AssetLite = {
  id: string;
  assetTag: string;
  location: string;
  category: string;
  model: string | null;
  serialNumber: string | null;
};

type ScanLite = {
  assetId: string;
};

export const computeInventoryReport = (
  sessionLocation: string,
  assets: AssetLite[],
  scans: ScanLite[]
) => {
  const expectedAssets = assets.filter((asset) => asset.location === sessionLocation);
  const expectedIds = new Set(expectedAssets.map((asset) => asset.id));
  const scannedIds = new Set(scans.map((scan) => scan.assetId));

  const verified: AssetLite[] = [];
  const missing: AssetLite[] = [];
  const unexpectedIds: string[] = [];

  for (const asset of expectedAssets) {
    if (scannedIds.has(asset.id)) {
      verified.push(asset);
    } else {
      missing.push(asset);
    }
  }

  for (const scan of scans) {
    if (!expectedIds.has(scan.assetId)) {
      unexpectedIds.push(scan.assetId);
    }
  }

  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const unexpected = unexpectedIds
    .map((id) => assetMap.get(id))
    .filter((asset): asset is AssetLite => Boolean(asset));

  return {
    verifiedCount: verified.length,
    verified,
    missing,
    unexpected
  };
};
