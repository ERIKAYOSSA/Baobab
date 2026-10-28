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

describe.skipIf(!neo4jAvailable)("approval workflow", () => {
  const ids: Record<string, string> = {};

  async function tokenFor(personId: string) {
    const login = await request(app).post("/auth/login").send({ personId });
    expect(login.status).toBe(200);
    return login.body.data.token as string;
  }

  it("seeds parent and child for approval flow", async () => {
    const parent = await request(app).post("/persons").send({
      firstName: "Parent",
      lastName: "Approval",
      gender: "male"
    });
    expect(parent.status).toBe(201);
    ids.parent = parent.body.data.id;

    const child = await request(app).post("/persons").send({
      firstName: "Child",
      lastName: "Approval",
      gender: "female"
    });
    expect(child.status).toBe(201);
    ids.child = child.body.data.id;
  });

  it("child claim auto-approves when no prior family exists", async () => {
    const res = await request(app)
      .post("/relationship-requests")
      .set("Authorization", `Bearer ${await tokenFor(ids.child)}`)
      .send({
        type: "SIBLING_OF",
        fromPersonId: ids.child,
        toPersonId: ids.parent
      });

    expect([201, 202]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });

  it("third person joining requires parent approval", async () => {
    const newcomer = await request(app).post("/persons").send({
      firstName: "New",
      lastName: "Member",
      gender: "male"
    });
    ids.newcomer = newcomer.body.data.id;

    const req = await request(app)
      .post("/relationship-requests")
      .set("Authorization", `Bearer ${await tokenFor(ids.newcomer)}`)
      .send({
      type: "SIBLING_OF",
      fromPersonId: ids.newcomer,
      toPersonId: ids.child
    });

    expect(req.status).toBe(202);
    expect(req.body.data.status).toBe("pending");
    ids.requestId = req.body.data.requestId;
    ids.approvers = req.body.data.requiredApprovers;
    expect(ids.approvers.length).toBeGreaterThan(0);
  });

  it("approves until relationship is finalized", async () => {
    let finalized = false;

    for (const approverId of ids.approvers) {
      const vote = await request(app)
        .post(`/relationship-requests/${ids.requestId}/decide`)
        .set("Authorization", `Bearer ${await tokenFor(approverId)}`)
        .send({ decision: "approved" });

      expect(vote.status).toBe(200);
      if (vote.body.data.outcome.finalized) finalized = true;
    }

    expect(finalized).toBe(true);

    const detail = await request(app).get(`/relationship-requests/${ids.requestId}`);
    expect(detail.body.data.status).toBe("approved");
  });

  it("rejects duplicate father conflict", async () => {
    const father1 = await request(app).post("/persons").send({
      firstName: "Father1",
      lastName: "Conflict",
      gender: "male"
    });
    const father2 = await request(app).post("/persons").send({
      firstName: "Father2",
      lastName: "Conflict",
      gender: "male"
    });
    const baby = await request(app).post("/persons").send({
      firstName: "Baby",
      lastName: "Conflict",
      gender: "male"
    });

    const first = await request(app)
      .post("/relationship-requests")
      .set("Authorization", `Bearer ${await tokenFor(father1.body.data.id)}`)
      .send({
      type: "FATHER_OF",
      fromPersonId: father1.body.data.id,
      toPersonId: baby.body.data.id
    });
    expect(first.status).toBe(201);

    const conflict = await request(app)
      .post("/relationship-requests")
      .set("Authorization", `Bearer ${await tokenFor(father2.body.data.id)}`)
      .send({
      type: "FATHER_OF",
      fromPersonId: father2.body.data.id,
      toPersonId: baby.body.data.id
    });

    expect(conflict.status).toBe(202);
    expect(conflict.body.data.status).toBe("pending");
    expect(String(conflict.body.data.appellation)).toContain("selon");
    expect(conflict.body.data.requiredApprovers).toContain(father1.body.data.id);
  });

  afterAll(async () => {
    await closeDriver();
  });
});
