import crypto from "crypto";
import { config } from "../config";

export const generateAssetTag = () => {
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${config.ministryCode}-${suffix}`.toUpperCase();
};
