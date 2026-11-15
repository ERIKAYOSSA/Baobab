import { Router } from "express";
import { getDriver } from "../db/neo4j";
import {
  autoRelationshipTypes,
  createRelationshipSchema,
  deleteRelationshipQuerySchema,
  relationshipTypeSchema,
  userRelationshipTypes
} from "../schemas/relationship";
import { syncConsanguinityRelationships } from "../services/consanguinitySync";
import {
  createRelationshipRequest,
  pendingRequestExists,
  relationshipExists
} from "../services/familyApproval";
import { detectRelationshipConflicts } from "../services/relationshipConflicts";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const relationshipsRouter = Router();

relationshipsRouter.get("/", async (req, res) => {
  const typeParam = req.query.type;
  let typeFilter: string | undefined;

  if (typeParam !== undefined) {
    const parsed = relationshipTypeSchema.safeParse(typeParam);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Invalid relationship type filter",
        allowed: relationshipTypeSchema.options
      });
    }
    typeFilter = parsed.data;
  }

  const session = getDriver().session();

  try {
    const result = await session.run(
      typeFilter
        ? `
          MATCH (a:Person)-[r:${typeFilter}]->(b:Person)
          RETURN type(r) AS type, a.id AS fromPersonId, b.id AS toPersonId, r.createdAt AS createdAt
          ORDER BY type, a.lastName, b.lastName
          LIMIT 500
          `
        : `
          MATCH (a:Person)-[r]->(b:Person)
          WHERE type(r) IN [
            'PARENT_OF', 'FATHER_OF', 'MOTHER_OF',
            'HUSBAND_OF', 'WIFE_OF', 'MARRIED_TO', 'CO_WIFE_OF',
            'SIBLING_OF', 'FULL_SIBLING_OF', 'HALF_SIBLING_OF', 'COUSIN_OF'
          ]
          RETURN type(r) AS type, a.id AS fromPersonId, b.id AS toPersonId, r.createdAt AS createdAt
          ORDER BY type, a.lastName, b.lastName
          LIMIT 500
          `
    );

    const data = result.records.map((record) => ({
      type: record.get("type") as string,
      fromPersonId: record.get("fromPersonId") as string,
      toPersonId: record.get("toPersonId") as string,
      createdAt: record.get("createdAt") ?? null
    }));

    res.json({ ok: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch relationships",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

relationshipsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = createRelationshipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid payload",
      errors: parsed.error.flatten()
    });
  }

  const { type, fromPersonId, toPersonId } = parsed.data;
  const requesterId = req.auth!.personId;
  if (requesterId !== fromPersonId && requesterId !== toPersonId) {
    return res.status(403).json({
      ok: false,
      message: "You can only declare relationships that involve yourself"
    });
  }
  const session = getDriver().session();

  try {
    const persons = await session.run(
      `
      MATCH (a:Person {id: $fromPersonId}), (b:Person {id: $toPersonId})
      RETURN a.id AS fromId, b.id AS toId
      `,
      { fromPersonId, toPersonId }
    );

    if (persons.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "One or both persons were not found"
      });
    }

    if (await relationshipExists(session, type, fromPersonId, toPersonId)) {
      return res.status(409).json({
        ok: false,
        message: "Relationship already exists"
      });
    }

    if (await pendingRequestExists(session, type, fromPersonId, toPersonId)) {
      return res.status(409).json({
        ok: false,
        message: "A pending request already exists"
      });
    }

    const conflicts = await detectRelationshipConflicts(session, type, fromPersonId, toPersonId);
    if (conflicts.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Relationship conflicts detected",
        conflicts
      });
    }

    const result = await createRelationshipRequest(session, {
      type,
      requesterId,
      fromPersonId,
      toPersonId
    });

    const statusCode = result.autoApproved ? 201 : 202;
    res.status(statusCode).json({
      ok: true,
      message: result.autoApproved
        ? "Relationship created"
        : "Approval required from family members registered before you",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to create relationship",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

relationshipsRouter.delete("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = deleteRelationshipQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid query parameters",
      errors: parsed.error.flatten()
    });
  }

  const { type, fromPersonId, toPersonId } = parsed.data;
  const me = req.auth!.personId;
  if (me !== fromPersonId && me !== toPersonId) {
    return res.status(403).json({
      ok: false,
      message: "You can only delete relationships that involve yourself"
    });
  }
  const session = getDriver().session();

  try {
    const result = await session.run(
      `
      MATCH (a:Person {id: $fromPersonId})-[r:${type}]->(b:Person {id: $toPersonId})
      DELETE r
      RETURN type(r) AS type, a.id AS fromPersonId, b.id AS toPersonId
      `,
      { fromPersonId, toPersonId }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Relationship not found"
      });
    }

    // Les liens déduits (fratrie, cousins) sont recalculés après la suppression.
    await syncConsanguinityRelationships(session);

    const record = result.records[0];
    res.json({
      ok: true,
      data: {
        type: record.get("type") as string,
        fromPersonId: record.get("fromPersonId") as string,
        toPersonId: record.get("toPersonId") as string
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to delete relationship",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

/**
 * Retire une personne de MA famille : supprime tous les liens directs entre moi et elle
 * (parent, enfant, conjoint, fratrie…). La personne et le reste de l'arbre ne sont pas modifiés.
 * Les demandes de lien encore en attente entre nous sont annulées.
 */
relationshipsRouter.delete("/with/:otherPersonId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const me = req.auth!.personId;
  const otherPersonId = String(req.params.otherPersonId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(otherPersonId)) {
    return res.status(400).json({ ok: false, message: "Invalid person id" });
  }
  if (otherPersonId === me) {
    return res.status(400).json({ ok: false, message: "Cannot remove yourself" });
  }

  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (a:Person {id: $me})-[r]-(b:Person {id: $otherPersonId})
      WHERE type(r) IN $types
      WITH r, type(r) AS t
      DELETE r
      RETURN count(t) AS removed
      `,
      { me, otherPersonId, types: [...userRelationshipTypes, ...autoRelationshipTypes] }
    );
    const raw = result.records[0]?.get("removed");
    const removed =
      typeof raw === "object" && raw !== null && "low" in raw ? (raw as { low: number }).low : Number(raw ?? 0);

    const cancelledResult = await session.run(
      `
      MATCH (req:RelationshipRequest {status: 'pending'})
      WHERE (req.fromPersonId = $me AND req.toPersonId = $otherPersonId)
         OR (req.fromPersonId = $otherPersonId AND req.toPersonId = $me)
      SET req.status = 'cancelled', req.decidedAt = datetime()
      RETURN count(req) AS cancelled
      `,
      { me, otherPersonId }
    );
    const cancelledRaw = cancelledResult.records[0]?.get("cancelled");
    const cancelled =
      typeof cancelledRaw === "object" && cancelledRaw !== null && "low" in cancelledRaw
        ? (cancelledRaw as { low: number }).low
        : Number(cancelledRaw ?? 0);

    if (removed === 0 && cancelled === 0) {
      return res.status(404).json({ ok: false, message: "No direct link with this person" });
    }

    if (removed > 0) await syncConsanguinityRelationships(session);
    res.json({ ok: true, data: { removed, cancelled } });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to remove links",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

export { relationshipsRouter };
