import { Router } from "express";
import type { Session } from "neo4j-driver";
import { getDriver } from "../db/neo4j";
import {
  createRelationshipRequestSchema,
  decideRelationshipRequestSchema
} from "../schemas/relationshipRequest";
import {
  createRelationshipRequest,
  decideOnRequest,
  getRequestById,
  listPendingForApprover,
  PARTY_CONFLICT_CODES,
  partyAppellation,
  pendingRequestExists,
  relationshipExists
} from "../services/familyApproval";
import { detectRelationshipConflicts } from "../services/relationshipConflicts";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { proposeLinkSchema, resolveProposedLink } from "../schemas/proposeLink";

const relationshipRequestsRouter = Router();

async function loadRequesterName(session: Session, requesterId: string): Promise<string> {
  const result = await session.run(
    `MATCH (p:Person {id: $requesterId}) RETURN p.firstName AS firstName, p.lastName AS lastName`,
    { requesterId }
  );
  const first = (result.records[0]?.get("firstName") as string | null) ?? "";
  const last = (result.records[0]?.get("lastName") as string | null) ?? "";
  return [first, last].filter(Boolean).join(" ").trim();
}

relationshipRequestsRouter.get(
  "/pending/:approverId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
  const { approverId } = req.params;
  if (req.auth!.personId !== approverId) {
    return res.status(403).json({ ok: false, message: "You can only list your own pending approvals" });
  }
  const session = getDriver().session();

  try {
    const data = await listPendingForApprover(session, approverId);
    res.json({ ok: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to list pending approvals",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

relationshipRequestsRouter.get("/:requestId", async (req, res) => {
  const { requestId } = req.params;
  const session = getDriver().session();

  try {
    const data = await getRequestById(session, requestId);
    if (!data) {
      return res.status(404).json({ ok: false, message: "Request not found" });
    }
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch request",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

relationshipRequestsRouter.post("/propose", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = proposeLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid payload",
      errors: parsed.error.flatten()
    });
  }

  const requesterId = req.auth!.personId;
  const { type, targetPersonId, direction } = parsed.data;

  if (requesterId === targetPersonId) {
    return res.status(400).json({ ok: false, message: "Cannot propose a link to yourself" });
  }

  const { fromPersonId, toPersonId } = resolveProposedLink(type, requesterId, targetPersonId, direction);
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
      return res.status(404).json({ ok: false, message: "One or both persons were not found" });
    }

    if (await relationshipExists(session, type, fromPersonId, toPersonId)) {
      return res.status(409).json({ ok: false, message: "Relationship already exists" });
    }

    if (await pendingRequestExists(session, type, fromPersonId, toPersonId)) {
      return res.status(409).json({ ok: false, message: "A pending request already exists" });
    }

    const conflicts = await detectRelationshipConflicts(session, type, fromPersonId, toPersonId);
    const blocking = conflicts.filter((c) => !PARTY_CONFLICT_CODES.has(c.code));
    const party = conflicts.filter((c) => PARTY_CONFLICT_CODES.has(c.code));
    if (blocking.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Relationship conflicts detected",
        conflicts: blocking
      });
    }

    const appellation = party.length
      ? partyAppellation(type, await loadRequesterName(session, requesterId))
      : undefined;

    const result = await createRelationshipRequest(session, {
      type,
      requesterId,
      fromPersonId,
      toPersonId,
      appellation,
      partyConflictCodes: party.map((c) => c.code)
    });

    const statusCode = result.status === "approved" ? 201 : 202;
    res.status(statusCode).json({
      ok: true,
      message:
        result.status === "approved"
          ? "Lien créé et validé automatiquement."
          : result.status === "contested"
            ? "Versions en désaccord : chaque parti garde son appellation, sans écraser le lien officiel."
            : "Demande de lien envoyée à la famille.",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to propose link",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

relationshipRequestsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = createRelationshipRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid payload",
      errors: parsed.error.flatten()
    });
  }

  const { type, fromPersonId, toPersonId } = parsed.data;
  const requesterId = req.auth!.personId;

  const session = getDriver().session();

  try {
    if (requesterId !== fromPersonId && requesterId !== toPersonId) {
      // Exception : on peut relier deux personnes si l'on a soi-même créé l'une d'elles
      // (ex. un grand-parent décédé ajouté puis rattaché à son parent).
      const created = await session.run(
        `
        MATCH (p:Person)
        WHERE p.id IN [$fromPersonId, $toPersonId] AND p.createdBy = $requesterId
        RETURN count(p) AS c
        `,
        { fromPersonId, toPersonId, requesterId }
      );
      const c = created.records[0]?.get("c");
      const count = typeof c === "object" && c !== null && "low" in c ? (c as { low: number }).low : Number(c ?? 0);
      if (count === 0) {
        return res.status(403).json({
          ok: false,
          message: "You can only submit requests that involve yourself or a relative you added"
        });
      }
    }

    const persons = await session.run(
      `
      MATCH (a:Person {id: $fromPersonId}), (b:Person {id: $toPersonId})
      RETURN a.id AS fromId, b.id AS toId
      `,
      { fromPersonId, toPersonId }
    );

    if (persons.records.length === 0) {
      return res.status(404).json({ ok: false, message: "One or both persons were not found" });
    }

    if (await relationshipExists(session, type, fromPersonId, toPersonId)) {
      return res.status(409).json({ ok: false, message: "Relationship already exists" });
    }

    if (await pendingRequestExists(session, type, fromPersonId, toPersonId)) {
      return res.status(409).json({ ok: false, message: "A pending request already exists" });
    }

    const conflicts = await detectRelationshipConflicts(session, type, fromPersonId, toPersonId);
    const blocking = conflicts.filter((c) => !PARTY_CONFLICT_CODES.has(c.code));
    const party = conflicts.filter((c) => PARTY_CONFLICT_CODES.has(c.code));
    if (blocking.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Relationship conflicts detected",
        conflicts: blocking
      });
    }

    const appellation = party.length
      ? partyAppellation(type, await loadRequesterName(session, requesterId))
      : undefined;

    const result = await createRelationshipRequest(session, {
      type,
      requesterId,
      fromPersonId,
      toPersonId,
      appellation,
      partyConflictCodes: party.map((c) => c.code)
    });

    const statusCode = result.status === "approved" ? 201 : 202;
    res.status(statusCode).json({
      ok: true,
      message:
        result.status === "approved"
          ? "Relationship created (no registered family members to approve)."
          : result.status === "contested"
            ? "Party versions kept under their own appellations; the official link was not overwritten."
            : "Relationship request submitted; waiting for registered family members",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to create relationship request",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

relationshipRequestsRouter.post("/:requestId/decide", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = decideRelationshipRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid payload",
      errors: parsed.error.flatten()
    });
  }

  const { requestId } = req.params;
  const { decision } = parsed.data;
  const approverId = req.auth!.personId;

  const session = getDriver().session();

  try {
    const outcome = await decideOnRequest(session, requestId, approverId, decision);
    const request = await getRequestById(session, requestId);

    res.json({
      ok: true,
      message:
        outcome.status === "approved" && outcome.finalized
          ? "All approvals received; relationship is active and cousin links were synced"
          : outcome.status === "contested"
            ? "Votes split. Official link unchanged. Each party keeps its appellation."
            : outcome.status === "rejected"
              ? "Request rejected"
              : "Vote recorded; waiting for other family members",
      data: { outcome, request }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "APPROVAL_NOT_REQUIRED") {
      return res.status(403).json({
        ok: false,
        message: "This person is not required to approve this request"
      });
    }
    if (error instanceof Error && error.message === "REQUEST_ALREADY_CLOSED") {
      return res.status(409).json({ ok: false, message: "This request is already closed" });
    }

    res.status(500).json({
      ok: false,
      message: "Failed to record decision",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

export { relationshipRequestsRouter };
