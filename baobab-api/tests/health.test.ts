import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("health", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe("baobab-api");
  });

  it("GET / returns API docs list", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.docs).toContain("/persons/search?q=");
    expect(res.body.docs).toContain("/admin/diagnostics");
  });
});
