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

describe.skipIf(!neo4jAvailable)("auth integration", () => {
  let personId = "";
  let token = "";
  let refreshToken = "";

  it("creates a person for auth tests", async () => {
    const res = await request(app).post("/persons").send({
      firstName: "Auth",
      lastName: "Testeur",
      gender: "male"
    });
    expect(res.status).toBe(201);
    personId = res.body.data.id;
  });

  it("POST /auth/login issues access + refresh", async () => {
    const res = await request(app).post("/auth/login").send({ personId });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    token = res.body.data.token;
    refreshToken = res.body.data.refreshToken;
  });

  it("GET /auth/me returns profile with token", async () => {
    const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.person.id).toBe(personId);
  });

  it("POST /auth/refresh rotates tokens", async () => {
    const res = await request(app).post("/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    token = res.body.data.token;
    refreshToken = res.body.data.refreshToken;
  });

  it("POST /auth/set-pin requires auth and configures PIN", async () => {
    const created = await request(app).post("/persons").send({
      firstName: "Pin",
      lastName: "User",
      gender: "female"
    });
    const pinPersonId = created.body.data.id;
    const login = await request(app).post("/auth/login").send({ personId: pinPersonId });
    const access = login.body.data.token;

    const setPin = await request(app)
      .post("/auth/set-pin")
      .set("Authorization", `Bearer ${access}`)
      .send({ pin: "1234" });
    expect(setPin.status).toBe(201);

    const badLogin = await request(app).post("/auth/login").send({ personId: pinPersonId, pin: "0000" });
    expect(badLogin.status).toBe(401);

    const goodLogin = await request(app).post("/auth/login").send({ personId: pinPersonId, pin: "1234" });
    expect(goodLogin.status).toBe(200);
    expect(goodLogin.body.data.refreshToken).toBeTruthy();
  });

  it("PUT /persons/:id forbids other profiles", async () => {
    const other = await request(app).post("/persons").send({
      firstName: "Other",
      lastName: "User",
      gender: "male"
    });
    const otherId = other.body.data.id;
    const res = await request(app)
      .put(`/persons/${otherId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nickname: "Hacker" });
    expect(res.status).toBe(403);
  });

  afterAll(async () => {
    if (personId) {
      await request(app).delete(`/persons/${personId}`).set("Authorization", `Bearer ${token}`);
    }
    await closeDriver();
  });
});

describe("auth validation", () => {
  it("GET /auth/me rejects missing token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });
});
