/*
  Warnings:

  - You are about to alter the column `cost` on the `Asset` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `cost` on the `MaintenanceTicket` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "Asset" ALTER COLUMN "cost" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "MaintenanceTicket" ALTER COLUMN "cost" SET DATA TYPE DECIMAL(65,30);
