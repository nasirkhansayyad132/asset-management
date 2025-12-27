DO $$
BEGIN
  BEGIN
    ALTER TYPE "AssetEventType" ADD VALUE 'DISPOSE_REQUESTED';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE "MaintenanceTicket"
  ADD COLUMN "recommendDisposal" BOOLEAN NOT NULL DEFAULT false;
