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

describe.skipIf(!neo4jAvailable)("family tree ui metadata", () => {
  it("returns generations and ui groups from seed-like structure", async () => {
    const father = await request(app).post("/persons").send({
      firstName: "Papa",
      lastName: "Tree",
      gender: "male"
    });
    const mother = await request(app).post("/persons").send({
      firstName: "Maman",
      lastName: "Tree",
      gender: "female"
    });
    const child = await request(app).post("/persons").send({
      firstName: "Enfant",
      lastName: "Tree",
      gender: "female"
    });

    await request(app).post("/relationship-requests").send({
      type: "FATHER_OF",
      requesterId: father.body.data.id,
      fromPersonId: father.body.data.id,
      toPersonId: child.body.data.id
    });
    await request(app).post("/relationship-requests").send({
      type: "MOTHER_OF",
      requesterId: mother.body.data.id,
      fromPersonId: mother.body.data.id,
      toPersonId: child.body.data.id
    });

    const tree = await request(app).get(`/persons/${child.body.data.id}/family-tree`).query({ depth: 2 });
    expect(tree.status).toBe(200);
    expect(tree.body.data.meta.generations).toContain(0);
    expect(tree.body.data.nodes.every((n: { ui: { label: string } }) => n.ui?.label)).toBe(true);

    const root = tree.body.data.root;
    expect(root.roles).toContain("self");
    expect(root.ui.group).toBe("self");
  });

  afterAll(async () => {
    await closeDriver();
  });
});
