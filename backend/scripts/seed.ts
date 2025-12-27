import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { prisma } from "../src/db";
import { AssetEventType, Role, RequestStatus } from "@prisma/client";

const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend/.env"),
  path.resolve(__dirname, "../.env")
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Create backend/.env from backend/.env.example.");
  process.exit(1);
}

const password = "Password123!";
const ministryCode = process.env.MINISTRY_CODE || "MINISTRY";

const users = [
  { email: "admin@ministry.local", role: Role.ADMIN },
  { email: "clerk@ministry.local", role: Role.STORE_CLERK },
  { email: "approver@ministry.local", role: Role.APPROVER },
  { email: "inventory@ministry.local", role: Role.INVENTORY },
  { email: "maintenance@ministry.local", role: Role.MAINTENANCE },
  { email: "auditor@ministry.local", role: Role.AUDITOR }
];

const sampleAssets = [
  {
    assetTag: `${ministryCode}-LT-1001`,
    category: "Laptop",
    make: "Dell",
    model: "Latitude 5420",
    serialNumber: "SN-LT-1001",
    vendor: "GovSupply",
    location: "HQ Stores",
    condition: "New"
  },
  {
    assetTag: `${ministryCode}-PR-2001`,
    category: "Printer",
    make: "HP",
    model: "LaserJet M404",
    serialNumber: "SN-PR-2001",
    vendor: "PrintCo",
    location: "HQ Stores",
    condition: "Good"
  },
  {
    assetTag: `${ministryCode}-DS-3001`,
    category: "Desktop",
    make: "Lenovo",
    model: "ThinkCentre",
    serialNumber: "SN-DS-3001",
    vendor: "TechPartners",
    location: "Finance Dept",
    condition: "Good"
  }
];

const run = async () => {
  const hashed = await bcrypt.hash(password, 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role },
      create: {
        email: user.email,
        role: user.role,
        passwordHash: hashed
      }
    });
  }

  const admin = await prisma.user.findUnique({
    where: { email: "admin@ministry.local" }
  });

  for (const asset of sampleAssets) {
    const record = await prisma.asset.upsert({
      where: { assetTag: asset.assetTag },
      update: {
        location: asset.location,
        condition: asset.condition
      },
      create: {
        assetTag: asset.assetTag,
        category: asset.category,
        make: asset.make,
        model: asset.model,
        serialNumber: asset.serialNumber,
        vendor: asset.vendor,
        location: asset.location,
        condition: asset.condition
      }
    });

    if (admin) {
      const existingEvent = await prisma.assetEvent.findFirst({
        where: { assetId: record.id, type: AssetEventType.CREATED }
      });
      if (!existingEvent) {
        await prisma.assetEvent.create({
          data: {
            assetId: record.id,
            type: AssetEventType.CREATED,
            actorUserId: admin.id,
            metaJson: { assetTag: record.assetTag }
          }
        });
      }
    }
  }

  if (admin) {
    const firstAsset = await prisma.asset.findFirst({
      where: { assetTag: `${ministryCode}-LT-1001` }
    });
    if (firstAsset) {
      const existingRequest = await prisma.request.findFirst({
        where: { assetId: firstAsset.id, status: RequestStatus.PENDING }
      });
      if (!existingRequest) {
        await prisma.request.create({
          data: {
            assetId: firstAsset.id,
            type: "ASSIGN",
            toCustodian: "ICT Unit",
            requestedBy: admin.id
          }
        });
      }
    }
  }

  console.log("Seed complete. Default password:", password);
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
