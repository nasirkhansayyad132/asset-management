import { beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { Role } from "@prisma/client";

let signToken: (user: { id: string; role: Role; email: string }) => string;
let requireAuth: express.RequestHandler;
let requireRoles: (...roles: Role[]) => express.RequestHandler;

beforeAll(async () => {
  process.env.JWT_SECRET = "test_jwt_secret";
  const auth = await import("../src/middleware/auth");
  const roles = await import("../src/middleware/roles");
  signToken = auth.signToken;
  requireAuth = auth.requireAuth;
  requireRoles = roles.requireRoles;
});

describe("RBAC middleware", () => {
  it("allows admin access", async () => {
    const app = express();
    app.get("/admin", requireAuth, requireRoles(Role.ADMIN), (_req, res) => {
      res.json({ ok: true });
    });

    const token = signToken({ id: "1", role: Role.ADMIN, email: "admin@test" });
    const response = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it("blocks non-admin access", async () => {
    const app = express();
    app.get("/admin", requireAuth, requireRoles(Role.ADMIN), (_req, res) => {
      res.json({ ok: true });
    });

    const token = signToken({
      id: "2",
      role: Role.STORE_CLERK,
      email: "clerk@test"
    });
    const response = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("rejects missing tokens", async () => {
    const app = express();
    app.get("/admin", requireAuth, requireRoles(Role.ADMIN), (_req, res) => {
      res.json({ ok: true });
    });

    const response = await request(app).get("/admin");
    expect(response.status).toBe(401);
  });
});
