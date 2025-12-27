-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STORE_CLERK', 'APPROVER', 'MAINTENANCE', 'INVENTORY', 'AUDITOR');

CREATE TYPE "AssetStatus" AS ENUM ('IN_STORE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'DISPOSED');

CREATE TYPE "AssetEventType" AS ENUM (
  'CREATED',
  'UPDATED',
  'ASSIGN_REQUESTED',
  'TRANSFER_REQUESTED',
  'ASSIGNED',
  'TRANSFERRED',
  'MAINTENANCE_OPENED',
  'MAINTENANCE_CLOSED',
  'VERIFIED',
  'DISPOSED',
  'HANDOVER_UPLOADED'
);

CREATE TYPE "RequestType" AS ENUM ('ASSIGN', 'TRANSFER', 'DISPOSE');

CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE "Asset" (
  "id" TEXT NOT NULL,
  "assetTag" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "make" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "cost" NUMERIC,
  "vendor" TEXT,
  "purchaseDate" TIMESTAMP(3),
  "location" TEXT NOT NULL,
  "status" "AssetStatus" NOT NULL DEFAULT 'IN_STORE',
  "condition" TEXT,
  "custodian" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Asset_assetTag_key" ON "Asset"("assetTag");
CREATE INDEX "Asset_serialNumber_idx" ON "Asset"("serialNumber");
CREATE INDEX "Asset_assetTag_idx" ON "Asset"("assetTag");
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
CREATE INDEX "Asset_location_idx" ON "Asset"("location");

-- CreateTable
CREATE TABLE "AssetEvent" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "type" "AssetEventType" NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssetEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "type" "RequestType" NOT NULL,
  "fromCustodian" TEXT,
  "toCustodian" TEXT NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverDocument" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "requestId" TEXT,
  "filePath" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HandoverDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
  "issue" TEXT NOT NULL,
  "vendor" TEXT,
  "cost" NUMERIC,
  "notes" TEXT,
  "openedBy" TEXT NOT NULL,
  "closedBy" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),

  CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySession" (
  "id" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "startedBy" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),

  CONSTRAINT "InventorySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryScan" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "scannedBy" TEXT NOT NULL,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryScan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryScan_sessionId_assetId_idx" ON "InventoryScan"("sessionId", "assetId");

-- CreateTable
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssetEvent" ADD CONSTRAINT "AssetEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetEvent" ADD CONSTRAINT "AssetEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Request" ADD CONSTRAINT "Request_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HandoverDocument" ADD CONSTRAINT "HandoverDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoverDocument" ADD CONSTRAINT "HandoverDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HandoverDocument" ADD CONSTRAINT "HandoverDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventorySession" ADD CONSTRAINT "InventorySession_startedBy_fkey" FOREIGN KEY ("startedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryScan" ADD CONSTRAINT "InventoryScan_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InventorySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryScan" ADD CONSTRAINT "InventoryScan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryScan" ADD CONSTRAINT "InventoryScan_scannedBy_fkey" FOREIGN KEY ("scannedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
