import { Router } from "express";
import { getDriver } from "../db/neo4j";
import {
  createRelationshipSchema,
  deleteRelationshipQuerySchema,
  relationshipTypeSchema
} from "../schemas/relationship";
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

export { relationshipsRouter };
