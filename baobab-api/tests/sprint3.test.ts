import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { closeDriver, getDriver } from "../src/db/neo4j";

const neo4jAvailable = await (async () => {
  try {
    await getDriver().verifyConnectivity();
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!neo4jAvailable)("sprint 3 features", () => {
  let token = "";
  let personId = "";

  it("setup person with PIN", async () => {
    const created = await request(app).post("/persons").send({
      firstName: "Sprint3",
      lastName: "User",
      gender: "female"
    });
    personId = created.body.data.id;

    const setPin = await request(app).post("/auth/set-pin").send({ personId, pin: "1234" });
    token = setPin.body.data.token;
    expect(setPin.status).toBe(201);
  });

  it("GET /notifications returns structured feed", async () => {
    const res = await request(app).get("/notifications").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
    expect(Array.isArray(res.body.data.pendingApprovals)).toBe(true);
  });

  it("POST /auth/change-pin updates PIN", async () => {
    const res = await request(app)
      .post("/auth/change-pin")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPin: "1234", newPin: "5678" });

    expect(res.status).toBe(200);

    const loginOld = await request(app).post("/auth/login").send({ personId, pin: "1234" });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app).post("/auth/login").send({ personId, pin: "5678" });
    expect(loginNew.status).toBe(200);
  });

  it("GET family-tree export returns SVG", async () => {
    const res = await request(app).get(`/persons/${personId}/family-tree/export`).query({ format: "svg" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/svg+xml");
    const body = String(res.text ?? res.body ?? "");
    expect(body).toContain("<svg");
  });

  afterAll(async () => {
    if (personId) await request(app).delete(`/persons/${personId}`);
    await closeDriver();
  });
});
