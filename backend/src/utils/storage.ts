import fs from "fs";
import path from "path";
import crypto from "crypto";

export const ensureDir = async (dirPath: string) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

export const computeSha256 = async (filePath: string) => {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
};

export const sanitizeFileName = (name: string) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
};

export const joinStoragePath = (...parts: string[]) => {
  return path.join(...parts);
};
