import { Router } from "express";
import { getDriver } from "../db/neo4j";
import { syncConsanguinityRelationships } from "../services/consanguinitySync";
import { requireAuth } from "../middleware/auth";

const adminRouter = Router();

adminRouter.get("/diagnostics", requireAuth, async (_req, res) => {
  const session = getDriver().session();

  try {
    const [counts, pendingRequests, recentPersons, relBreakdown] = await Promise.all([
      session.run(`
        MATCH (p:Person) WITH count(p) AS persons
        MATCH ()-[r]->() WITH persons, count(r) AS relationships
        MATCH (req:RelationshipRequest) WITH persons, relationships, count(req) AS requests
        RETURN persons, relationships, requests
      `),
      session.run(`
        MATCH (req:RelationshipRequest {status: 'pending'})
        OPTIONAL MATCH (approver:Person)-[a:MUST_APPROVE]->(req)
        RETURN req.id AS id, req.type AS type, req.requesterId AS requesterId,
               count(CASE WHEN a.status = 'pending' THEN 1 END) AS pendingVotes,
               count(a) AS totalVotes
        ORDER BY req.createdAt DESC
        LIMIT 20
      `),
      session.run(`
        MATCH (p:Person)
        RETURN p.id AS id, p.firstName AS firstName, p.lastName AS lastName, p.createdAt AS createdAt
        ORDER BY p.createdAt DESC
        LIMIT 10
      `),
      session.run(`
        MATCH ()-[r]->()
        RETURN type(r) AS type, count(r) AS count
        ORDER BY count DESC
      `)
    ]);

    const countRecord = counts.records[0];
    const toNum = (v: unknown) =>
      typeof v === "object" && v !== null && "low" in v ? (v as { low: number }).low : Number(v ?? 0);

    res.json({
      ok: true,
      data: {
        totals: {
          persons: toNum(countRecord?.get("persons")),
          relationships: toNum(countRecord?.get("relationships")),
          requests: toNum(countRecord?.get("requests"))
        },
        relationshipBreakdown: relBreakdown.records.map((r) => ({
          type: r.get("type") as string,
          count: toNum(r.get("count"))
        })),
        pendingRequests: pendingRequests.records.map((r) => ({
          id: r.get("id") as string,
          type: r.get("type") as string,
          requesterId: r.get("requesterId") as string,
          pendingVotes: toNum(r.get("pendingVotes")),
          totalVotes: toNum(r.get("totalVotes"))
        })),
        recentPersons: recentPersons.records.map((r) => ({
          id: r.get("id") as string,
          firstName: r.get("firstName") as string,
          lastName: r.get("lastName") as string,
          createdAt: r.get("createdAt")
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to load diagnostics",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

adminRouter.post("/sync-consanguinity", requireAuth, async (_req, res) => {
  const session = getDriver().session();

  try {
    const result = await syncConsanguinityRelationships(session);
    res.json({
      ok: true,
      message: "Consanguinity relationships synchronized",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to sync consanguinity",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

export { adminRouter };
