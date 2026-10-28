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

describe.skipIf(!neo4jAvailable)("persons integration", () => {
  let createdPersonId = "";

  it("POST /persons creates a person", async () => {
    const res = await request(app).post("/persons").send({
      firstName: "Test",
      lastName: "Baobab",
      gender: "female",
      village: "Ouagadougou"
    });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.firstName).toBe("Test");
    createdPersonId = res.body.data.id;
  });

  it("GET /persons/:id returns the person", async () => {
    const res = await request(app).get(`/persons/${createdPersonId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdPersonId);
  });

  it("GET /persons/search finds the person", async () => {
    const res = await request(app).get("/persons/search").query({ q: "Baobab" });
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  });

  it("PUT /persons/:id updates the person", async () => {
    const login = await request(app).post("/auth/login").send({ personId: createdPersonId });
    const token = login.body.data.token as string;
    const res = await request(app)
      .put(`/persons/${createdPersonId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ village: "Bobo-Dioulasso" });

    expect(res.status).toBe(200);
    expect(res.body.data.village).toBe("Bobo-Dioulasso");
  });

  it("PUT /persons/:id stores profile photo and identity fields", async () => {
    const login = await request(app).post("/auth/login").send({ personId: createdPersonId });
    const token = login.body.data.token as string;
    const photoUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const res = await request(app)
      .put(`/persons/${createdPersonId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        photoUrl,
        nickname: "Amina",
        honorifics: ["Nana"],
        socialTitle: "elder",
        headOfFamily: true,
        maritalStatus: "married",
        residence: "Ouagadougou",
        burialPlace: null,
        ethnicity: "Mossi",
        clan: "Nakombgo",
        languages: ["Mooré", "Français"],
        nationalities: ["Burkinabè"],
        birthCountry: "Burkina Faso",
        birthCity: "Ouagadougou",
        birthQuarter: "Dassasgho"
      });

    expect(res.status).toBe(200);
    expect(res.body.data.photoUrl).toBe(photoUrl);
    expect(res.body.data.nickname).toBe("Amina");
    expect(res.body.data.honorifics).toEqual(["Nana"]);
    expect(res.body.data.socialTitle).toBe("elder");
    expect(res.body.data.headOfFamily).toBe(true);
    expect(res.body.data.maritalStatus).toBe("married");
    expect(res.body.data.residence).toBe("Ouagadougou");
    expect(res.body.data.ethnicity).toBe("Mossi");
    expect(res.body.data.languages).toEqual(["Mooré", "Français"]);
    expect(res.body.data.birthCity).toBe("Ouagadougou");
  });

  it("GET /persons/:id/family-tree returns root node", async () => {
    const res = await request(app).get(`/persons/${createdPersonId}/family-tree`);
    expect(res.status).toBe(200);
    expect(res.body.data.root.id).toBe(createdPersonId);
  });

  it("DELETE /persons/:id removes the person", async () => {
    const login = await request(app).post("/auth/login").send({ personId: createdPersonId });
    const token = login.body.data.token as string;
    const res = await request(app)
      .delete(`/persons/${createdPersonId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  afterAll(async () => {
    await closeDriver();
  });
});

describe("validation", () => {
  it("POST /persons rejects empty payload", async () => {
    const res = await request(app).post("/persons").send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("GET /persons/search rejects empty q", async () => {
    const res = await request(app).get("/persons/search").query({ q: "" });
    expect(res.status).toBe(400);
  });
});
