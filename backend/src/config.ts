import fs from "fs";
import path from "path";
import dotenv from "dotenv";

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

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  port: toNumber(process.env.PORT, 4000),
  jwtSecret: process.env.JWT_SECRET || "dev_jwt_secret",
  qrSecret: process.env.QR_SECRET || "dev_qr_secret",
  ministryCode: process.env.MINISTRY_CODE || "MINISTRY",
  storageDir: process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR)
    : path.resolve(process.cwd(), "storage"),
  aiApiKey: process.env.AI_API_KEY || "",
  aiApiBaseUrl: process.env.AI_API_BASE_URL || "https://api.openai.com/v1",
  aiModel: process.env.AI_MODEL || "gpt-4o-mini"
};
