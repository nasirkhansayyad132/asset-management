import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { requireAuth, signToken } from "../src/middleware/auth";
import { requireRoles } from "../src/middleware/roles";
import { Role } from "@prisma/client";

describe("role-protected endpoint", () => {
  const app = express();
  app.get(
    "/admin",
    requireAuth,
    requireRoles(Role.ADMIN),
    (_req, res) => res.json({ ok: true })
  );

  it("allows admin access", async () => {
    const token = signToken({ id: "u1", email: "admin@test", role: Role.ADMIN });
    const res = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("blocks non-admin access", async () => {
    const token = signToken({
      id: "u2",
      email: "clerk@test",
      role: Role.STORE_CLERK
    });
    const res = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/admin");
    expect(res.status).toBe(401);
  });
});
