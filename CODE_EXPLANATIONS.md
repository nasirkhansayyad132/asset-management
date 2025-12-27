# Line-by-Line Code Explanations

## Backend Code Deep Dive

### src/app.ts - Express Application Setup

```typescript
import express from "express";
```
- Imports the Express web framework
- Express is used to create HTTP server and define routes

```typescript
import cors from "cors";
```
- Imports CORS (Cross-Origin Resource Sharing) middleware
- Allows frontend (on different port/domain) to access backend APIs

```typescript
import type { Request, Response, NextFunction } from "express";
```
- Imports TypeScript types for Express request handlers
- `Request`: HTTP request object
- `Response`: HTTP response object
- `NextFunction`: Callback to pass control to next middleware

```typescript
import authRoutes from "./routes/auth";
```
- Imports authentication routes (login)
- Contains POST /auth/login endpoint

```typescript
import { requireAuth } from "./middleware/auth";
```
- Imports authentication middleware
- Checks for valid JWT token in Authorization header

```typescript
const app = express();
```
- Creates Express application instance
- This app object is used to configure middleware and routes

```typescript
app.use(cors());
```
- Enables CORS for all routes
- Allows any origin to access the API (permissive for development)

```typescript
app.use(express.json({ limit: "2mb" }));
```
- Parses incoming JSON request bodies
- Limit set to 2MB to prevent large payload attacks
- Makes req.body available with parsed JSON data

```typescript
app.use(express.urlencoded({ extended: true }));
```
- Parses URL-encoded form data (application/x-www-form-urlencoded)
- `extended: true` allows rich objects and arrays to be encoded

```typescript
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
```
- Health check endpoint for monitoring/load balancers
- Returns simple JSON indicating server is running
- `_req` prefix indicates parameter is intentionally unused

```typescript
app.use("/auth", authRoutes);
```
- Mounts authentication routes at /auth prefix
- All routes in authRoutes will be prefixed with /auth
- This is PUBLIC - no authentication required

```typescript
app.use(requireAuth);
```
- Applies authentication middleware to ALL subsequent routes
- Every route after this line requires valid JWT token
- Returns 401 Unauthorized if token missing/invalid

```typescript
app.use("/users", userRoutes);
```
- Mounts user management routes at /users
- Protected by requireAuth middleware above

```typescript
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
```
- Global error handler (has 4 parameters including err)
- Catches errors thrown by route handlers or middleware

```typescript
  if (err.message === "Unsupported file type") {
    return res.status(400).json({ error: err.message });
  }
```
- Special handling for file upload type errors
- Returns 400 Bad Request with error message

```typescript
  return res.status(500).json({ error: "Server error" });
```
- Default error response for unhandled errors
- Returns 500 Internal Server Error

```typescript
export default app;
```
- Exports app for use in server.ts and tests
- Allows separation of app configuration from server startup

---

### src/server.ts - Server Entry Point

```typescript
import app from "./app";
```
- Imports configured Express app from app.ts

```typescript
import { config } from "./config";
```
- Imports configuration object (port, secrets, etc.)
- Loaded from environment variables

```typescript
app.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
```
- Starts HTTP server on configured port (default 4000)
- Callback executes when server successfully starts
- Logs confirmation message to console

---

### src/config.ts - Configuration Management

```typescript
import dotenv from "dotenv";
dotenv.config();
```
- Loads environment variables from .env file
- Must be called before accessing process.env

```typescript
export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
```
- Reads PORT from environment, defaults to 4000
- `parseInt(..., 10)` converts string to number (base 10)

```typescript
  jwtSecret: process.env.JWT_SECRET || "dev_jwt_secret",
```
- Secret key for signing JWT tokens
- Should be long random string in production
- Defaults to "dev_jwt_secret" for development

```typescript
  qrSecret: process.env.QR_SECRET || "dev_qr_secret",
```
- Secret key for signing QR code payloads
- Prevents tampering with QR code data

```typescript
  ministryCode: process.env.MINISTRY_CODE || "MOHE",
```
- Ministry identifier used in asset tags
- Example: "MOHE" = Ministry of Higher Education

```typescript
  storageDir: process.env.STORAGE_DIR || "./storage",
```
- Directory path for uploaded files (handover documents)
- Relative path from project root

```typescript
  aiApiKey: process.env.AI_API_KEY || "",
  aiApiBaseUrl: process.env.AI_API_BASE_URL || "https://api.openai.com/v1",
  aiModel: process.env.AI_MODEL || "gpt-4o-mini",
};
```
- AI service configuration for extract-asset and risk-summary
- Falls back to mock responses if AI_API_KEY is empty

---

### src/middleware/auth.ts - JWT Authentication

```typescript
import type { NextFunction, Request, Response } from "express";
```
- TypeScript types for Express middleware

```typescript
import jwt from "jsonwebtoken";
```
- Library for creating and verifying JSON Web Tokens

```typescript
import { config } from "../config";
import type { AuthUser } from "../types";
```
- Imports config for JWT secret
- AuthUser type: `{ id: string, role: Role, email: string }`

```typescript
export const signToken = (user: AuthUser) => {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "8h" });
};
```
- Creates JWT token from user data
- Signs with secret key (prevents tampering)
- Token expires after 8 hours
- Returns token string (used in login response)

```typescript
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
```
- Middleware function to validate JWT on protected routes

```typescript
  const header = req.headers.authorization;
```
- Gets Authorization header from request
- Format: "Bearer <token>"

```typescript
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
```
- Checks if header exists and has correct format
- Returns 401 Unauthorized if missing or malformed

```typescript
  const token = header.slice("Bearer ".length).trim();
```
- Extracts token from "Bearer <token>" string
- Removes "Bearer " prefix and whitespace

```typescript
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
```
- Verifies token signature with secret key
- Throws error if token invalid or expired
- Decodes payload to AuthUser object

```typescript
    req.user = payload;
```
- Attaches user info to request object
- Available in all subsequent route handlers as req.user

```typescript
    return next();
```
- Passes control to next middleware/route handler
- Only called if token is valid

```typescript
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
```
- Catches verification errors (invalid signature, expired, malformed)
- Returns 401 Unauthorized with error message

---

### src/middleware/roles.ts - Role-Based Access Control

```typescript
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
```
- Express types and Prisma Role enum

```typescript
export const requireRoles = (roles: Role[]) => {
```
- Higher-order function that returns middleware
- Takes array of allowed roles as parameter

```typescript
  return (req: Request, res: Response, next: NextFunction) => {
```
- Returns actual middleware function
- Closure captures `roles` parameter

```typescript
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
```
- Checks if user is authenticated (set by requireAuth)
- Should never happen if requireAuth is applied first

```typescript
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
```
- Checks if user's role is in allowed roles array
- Returns 403 Forbidden if not authorized
- 403 vs 401: User is authenticated but lacks permission

```typescript
    return next();
  };
};
```
- Passes control to route handler if role check passes

**Usage Example:**
```typescript
router.post("/assets", requireRoles(["ADMIN", "STORE_CLERK"]), async (req, res) => {
  // Only ADMIN and STORE_CLERK can create assets
});
```

---

### src/routes/auth.ts - Authentication Routes

```typescript
import { Router } from "express";
```
- Creates Express router for grouping routes

```typescript
import bcrypt from "bcryptjs";
```
- Library for hashing and comparing passwords
- Uses bcrypt algorithm (slow, resistant to brute force)

```typescript
import { prisma } from "../db";
```
- Prisma client instance for database queries

```typescript
import { signToken } from "../middleware/auth";
```
- Function to create JWT token

```typescript
import { logAudit } from "../utils/audit";
```
- Function to record audit log entry

```typescript
const router = Router();
```
- Creates router instance for this module

```typescript
router.post("/login", async (req, res) => {
```
- POST endpoint for user login
- Async because it queries database

```typescript
  const { email, password } = req.body as { email?: string; password?: string };
```
- Extracts email and password from request body
- TypeScript cast with optional properties (for safety)

```typescript
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
```
- Validates required fields present
- Returns 400 Bad Request if missing

```typescript
  const user = await prisma.user.findUnique({ where: { email } });
```
- Queries database for user with matching email
- Returns null if not found
- `await` pauses execution until query completes

```typescript
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
```
- Generic error message if user not found
- Prevents username enumeration attacks
- 401 Unauthorized (not 404) to hide user existence

```typescript
  const valid = await bcrypt.compare(password, user.passwordHash);
```
- Compares plaintext password with stored hash
- Bcrypt handles salt internally
- Returns true if match, false otherwise

```typescript
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
```
- Same error as user not found (prevents timing attacks)

```typescript
  const token = signToken({ id: user.id, role: user.role, email: user.email });
```
- Creates JWT with user information
- Token includes all data needed for authorization

```typescript
  await logAudit({
    actorUserId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    metaJson: { email: user.email }
  });
```
- Records login event in audit log
- Captures who, what, when for compliance/security

```typescript
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role }
  });
```
- Returns JWT token and user info
- Frontend stores token in localStorage
- User info used for UI personalization

```typescript
export default router;
```
- Exports router to be mounted in app.ts

---

### src/utils/assetTag.ts - Asset Tag Generation

```typescript
import { prisma } from "../db";
import { config } from "../config";
```
- Database client and configuration

```typescript
export const generateAssetTag = async () => {
```
- Async function to create unique asset tag
- Format: MINISTRY-YEAR-SEQUENCE

```typescript
  const year = new Date().getFullYear();
```
- Gets current year (e.g., 2024)

```typescript
  const prefix = `${config.ministryCode}-${year}`;
```
- Creates prefix: "MOHE-2024"

```typescript
  const lastAsset = await prisma.asset.findFirst({
    where: {
      assetTag: {
        startsWith: prefix
      }
    },
    orderBy: {
      assetTag: "desc"
    }
  });
```
- Finds latest asset with same year prefix
- Orders by assetTag descending (highest first)
- Returns null if no assets exist for this year

```typescript
  let nextSeq = 1;
```
- Default sequence number for first asset of year

```typescript
  if (lastAsset) {
    const parts = lastAsset.assetTag.split("-");
    const lastSeq = parseInt(parts[parts.length - 1] || "0", 10);
    nextSeq = lastSeq + 1;
  }
```
- If assets exist, parse last sequence number
- Split "MOHE-2024-00001" → ["MOHE", "2024", "00001"]
- Get last element and convert to number
- Increment by 1

```typescript
  const paddedSeq = String(nextSeq).padStart(5, "0");
```
- Pad sequence with leading zeros to 5 digits
- Example: 1 → "00001", 123 → "00123"

```typescript
  return `${prefix}-${paddedSeq}`;
```
- Returns complete tag: "MOHE-2024-00001"

---

### src/utils/qr.ts - QR Code Signing and Verification

```typescript
import crypto from "crypto";
import { config } from "../config";
```
- Node.js crypto library for HMAC signing
- Config for QR_SECRET

```typescript
export const buildQrPayload = (assetId: string) => {
```
- Creates signed QR code payload for an asset

```typescript
  const timestamp = Date.now().toString();
```
- Current timestamp in milliseconds
- Used to check QR code freshness (prevent replay attacks)

```typescript
  const data = `${assetId}:${timestamp}`;
```
- Combines assetId and timestamp with colon separator

```typescript
  const sig = crypto
    .createHmac("sha256", config.qrSecret)
    .update(data)
    .digest("hex");
```
- Creates HMAC (Hash-based Message Authentication Code)
- Uses SHA-256 hash algorithm
- Signed with QR_SECRET (only server knows this)
- Returns hex-encoded signature
- Prevents QR code tampering

```typescript
  return {
    assetId,
    timestamp,
    sig
  };
```
- Returns object with asset ID, timestamp, and signature
- Can be encoded as URL params or QR code data

```typescript
export const verifyQrSignature = (assetId: string, timestamp: string, sig: string) => {
```
- Validates QR code signature

```typescript
  const data = `${assetId}:${timestamp}`;
```
- Recreates data string from parameters

```typescript
  const expected = crypto
    .createHmac("sha256", config.qrSecret)
    .update(data)
    .digest("hex");
```
- Recomputes signature with same algorithm
- Should match sig parameter if valid

```typescript
  if (expected !== sig) {
    return { valid: false, error: "Invalid signature" };
  }
```
- Constant-time comparison would be better for security
- Returns error if signatures don't match

```typescript
  const age = Date.now() - parseInt(timestamp, 10);
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
```
- Calculates how old the QR code is
- maxAge = 24 hours in milliseconds

```typescript
  if (age > maxAge) {
    return { valid: false, error: "QR code expired" };
  }
```
- Rejects old QR codes (prevents replay attacks)

```typescript
  return { valid: true };
```
- QR code is authentic and fresh

---

## Frontend Code Deep Dive

### src/lib/api.ts - API Client

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
```
- Gets backend URL from Vite environment variable
- Falls back to localhost:4000 for development
- `import.meta.env` is Vite-specific way to access env vars

```typescript
export type ApiError = {
  error: string;
};
```
- Type for error responses from backend
- All API errors return { error: "message" }

```typescript
export const getToken = () => {
  const raw = localStorage.getItem("mam_auth");
```
- Retrieves auth data from browser localStorage
- Key: "mam_auth" (Ministry Asset Management)

```typescript
  if (!raw) {
    return null;
  }
```
- Returns null if no auth data stored (user not logged in)

```typescript
  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
```
- Parses JSON string to object
- Returns token property or null
- Catches JSON parse errors (corrupted data)

```typescript
const buildHeaders = (options?: RequestInit) => {
```
- Creates Headers object for fetch request

```typescript
  const headers = new Headers(options?.headers);
```
- Copies existing headers if provided
- Optional chaining (?.) handles undefined options

```typescript
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
```
- Adds JWT token to Authorization header if logged in
- Format: "Bearer <token>"

```typescript
  if (!(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
```
- Sets JSON content type for non-file uploads
- FormData sets its own multipart/form-data content type

```typescript
  return headers;
```
- Returns configured headers

```typescript
export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
```
- Generic function for API requests
- `<T>` is TypeScript generic for response type
- Returns Promise of type T

```typescript
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options)
  });
```
- Makes HTTP request with fetch API
- Spreads options and overrides headers
- Awaits response (doesn't parse body yet)

```typescript
  if (!response.ok) {
```
- Checks if status code is 2xx (ok is false for 4xx, 5xx)

```typescript
    let message = "Request failed";
    try {
      const data = (await response.json()) as ApiError;
      message = data.error || message;
    } catch {
      message = await response.text();
    }
```
- Tries to parse error as JSON
- Falls back to plain text if JSON parse fails
- Extracts error message from response

```typescript
    throw new Error(message);
```
- Throws error to be caught by caller
- React Query treats thrown errors as query failures

```typescript
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.blob()) as T;
```
- Parses response based on content type
- JSON for most API responses
- Blob for file downloads (QR codes, CSV exports)

---

### src/lib/auth.tsx - Authentication Context

```typescript
import { createContext, useContext, useState, useEffect } from "react";
```
- React hooks for creating global auth state

```typescript
type AuthData = {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
};
```
- Structure of authentication data
- Matches login response from backend

```typescript
type AuthContextType = {
  auth: AuthData | null;
  login: (token: string, user: AuthData["user"]) => void;
  logout: () => void;
};
```
- Context API shape
- Provides auth state and login/logout functions

```typescript
const AuthContext = createContext<AuthContextType | undefined>(undefined);
```
- Creates React context
- Stores auth state globally

```typescript
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
```
- Provider component wraps entire app
- Makes auth state available to all components

```typescript
  const [auth, setAuth] = useState<AuthData | null>(() => {
    const raw = localStorage.getItem("mam_auth");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthData;
    } catch {
      return null;
    }
  });
```
- Initializes state from localStorage
- Restores auth on page reload
- Lazy initialization with function (runs once)

```typescript
  const login = (token: string, user: AuthData["user"]) => {
    const data: AuthData = { token, user };
    localStorage.setItem("mam_auth", JSON.stringify(data));
    setAuth(data);
  };
```
- Saves token and user to localStorage
- Updates React state to trigger re-render
- Makes user "logged in"

```typescript
  const logout = () => {
    localStorage.removeItem("mam_auth");
    setAuth(null);
    window.location.href = "/login";
  };
```
- Removes auth data from localStorage
- Clears React state
- Redirects to login page (hard navigation)

```typescript
  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
```
- Provides auth state and functions to component tree

```typescript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
```
- Custom hook to access auth context
- Throws error if used outside provider (developer mistake)
- Returns { auth, login, logout }

---

This document provides line-by-line explanations of the most critical code files. Each section breaks down the purpose and implementation details of key functions, middleware, and utilities in the asset management system.
