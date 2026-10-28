import { Router } from "express";
import type { Request } from "express";
import { randomUUID } from "crypto";
import neo4j from "neo4j-driver";
import { getDriver } from "../db/neo4j";
import {
  createPersonSchema,
  personSearchQuerySchema,
  updatePersonSchema
} from "../schemas/person";
import { buildFamilyTree } from "../services/familyTree";
import { familyTreeToPrintableHtml, familyTreeToSvg } from "../services/treeExport";
import { listPendingForApprover } from "../services/familyApproval";
import { normalizePhone, verifyPhoneVerifiedToken } from "../services/otp";
import { consanguinityRouter } from "./consanguinity";
import {
  publicPerson,
  requireAuth,
  requireSelf,
  verifyAccessToken,
  type AuthenticatedRequest
} from "../middleware/auth";
import { canCompleteProfile } from "../services/familyApproval";

type PersonParams = { personId: string };

/** Normalize optional profile fields before writing to Neo4j (drop undefined, keep null to clear). */
function sanitizePersonFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      out[key] = trimmed.length === 0 ? null : trimmed;
      continue;
    }
    if (Array.isArray(value)) {
      const cleaned = value
        .map((item) => (typeof item === "string" ? item.trim() : item))
        .filter((item) => typeof item === "string" && item.length > 0);
      out[key] = cleaned.length > 0 ? cleaned : null;
      continue;
    }
    out[key] = value;
  }
  return out;
}

const personsRouter = Router();

personsRouter.get("/search", async (req, res) => {
  const parsed = personSearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid search query",
      errors: parsed.error.flatten()
    });
  }

  const { q, limit = 20 } = parsed.data;
  const session = getDriver().session();

  try {
    const result = await session.run(
      `
      MATCH (p:Person)
      WHERE toLower(p.firstName) CONTAINS toLower($q)
         OR toLower(p.lastName) CONTAINS toLower($q)
         OR (p.nickname IS NOT NULL AND toLower(p.nickname) CONTAINS toLower($q))
         OR (p.village IS NOT NULL AND toLower(p.village) CONTAINS toLower($q))
         OR (p.residence IS NOT NULL AND toLower(p.residence) CONTAINS toLower($q))
         OR (p.phone IS NOT NULL AND p.phone CONTAINS $q)
      RETURN p
      ORDER BY p.lastName, p.firstName
      LIMIT $limit
      `,
      { q, limit: neo4j.int(limit) }
    );

    const data = result.records.map((record) => publicPerson(record.get("p").properties));
    res.json({ ok: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to search persons",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.use("/:personId/consanguinity", consanguinityRouter);

personsRouter.get("/", async (_req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (p:Person)
      RETURN p
      ORDER BY p.lastName, p.firstName
      LIMIT 200
      `
    );

    const persons = result.records.map((record) => publicPerson(record.get("p").properties));
    res.json({ ok: true, count: persons.length, data: persons });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch persons",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.get("/:personId", async (req: Request<PersonParams>, res) => {
  const { personId } = req.params;
  const session = getDriver().session();

  try {
    const result = await session.run(`MATCH (p:Person {id: $personId}) RETURN p`, { personId });
    if (result.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    res.json({ ok: true, data: publicPerson(result.records[0].get("p").properties) });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch person",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.get("/:personId/family-tree/export", async (req: Request<PersonParams>, res) => {
  const { personId } = req.params;
  const depth = Number(req.query.depth ?? 2);
  const format = String(req.query.format ?? "svg");
  const session = getDriver().session();

  try {
    const tree = await buildFamilyTree(session, personId, depth);
    if (!tree) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    if (format === "json") {
      return res.json({ ok: true, personId, data: tree });
    }

    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="baobab-tree-${personId}.html"`);
      return res.send(familyTreeToPrintableHtml(tree));
    }

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="baobab-tree-${personId}.svg"`);
    res.send(familyTreeToSvg(tree));
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to export family tree",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.get("/:personId/family-tree", async (req: Request<PersonParams>, res) => {
  const { personId } = req.params;
  const depth = Number(req.query.depth ?? 2);
  const session = getDriver().session();

  try {
    const tree = await buildFamilyTree(session, personId, depth);
    if (!tree) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    res.json({
      ok: true,
      personId,
      data: tree
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to build family tree",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.get(
  "/:personId/pending-approvals",
  requireAuth,
  requireSelf("personId"),
  async (req: AuthenticatedRequest & Request<PersonParams>, res) => {
  const { personId } = req.params;
  const session = getDriver().session();

  try {
    const personCheck = await session.run(`MATCH (p:Person {id: $personId}) RETURN p.id AS id`, {
      personId
    });
    if (personCheck.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    const data = await listPendingForApprover(session, personId);
    res.json({ ok: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch pending approvals",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.get("/:personId/relationships", async (req: Request<PersonParams>, res) => {
  const { personId } = req.params;
  const session = getDriver().session();

  try {
    const personCheck = await session.run(`MATCH (p:Person {id: $personId}) RETURN p`, { personId });
    if (personCheck.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    const result = await session.run(
      `
      MATCH (p:Person {id: $personId})
      OPTIONAL MATCH (p)-[parentRel:PARENT_OF]->(child:Person)
      OPTIONAL MATCH (parent:Person)-[childRel:PARENT_OF]->(p)
      OPTIONAL MATCH (p)-[marriedOut:MARRIED_TO]->(spouseOut:Person)
      OPTIONAL MATCH (spouseIn:Person)-[marriedIn:MARRIED_TO]->(p)
      OPTIONAL MATCH (p)-[sibRelOut:SIBLING_OF]->(siblingOut:Person)
      OPTIONAL MATCH (siblingIn:Person)-[sibRelIn:SIBLING_OF]->(p)
      OPTIONAL MATCH (p)-[cousinRelOut:COUSIN_OF]->(cousinOut:Person)
      OPTIONAL MATCH (cousinIn:Person)-[cousinRelIn:COUSIN_OF]->(p)
      RETURN
        collect(DISTINCT child) AS children,
        collect(DISTINCT parent) AS parents,
        collect(DISTINCT spouseOut) + collect(DISTINCT spouseIn) AS spouses,
        collect(DISTINCT siblingOut) + collect(DISTINCT siblingIn) AS siblings,
        collect(DISTINCT cousinOut) + collect(DISTINCT cousinIn) AS cousins
      `,
      { personId }
    );

    const record = result.records[0];
    const toList = (nodes: unknown[]) =>
      nodes
        .filter((node): node is { properties: Record<string, unknown> } => node !== null)
        .map((node) => node.properties);

    res.json({
      ok: true,
      personId,
      data: {
        parents: toList(record.get("parents")),
        children: toList(record.get("children")),
        spouses: toList(record.get("spouses")),
        siblings: toList(record.get("siblings")),
        cousins: toList(record.get("cousins"))
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch person relationships",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.post("/", async (req, res) => {
  const parsed = createPersonSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid payload",
      errors: parsed.error.flatten()
    });
  }

  const personId = randomUUID();
  const session = getDriver().session();

  try {
    const payload = parsed.data;

    if (payload.phone) {
      if (!payload.phoneVerifiedToken || !verifyPhoneVerifiedToken(payload.phoneVerifiedToken, payload.phone)) {
        return res.status(401).json({ ok: false, message: "Phone verification required" });
      }

      const existingPhone = await session.run(
        `MATCH (p:Person {phone: $phone}) RETURN p LIMIT 1`,
        { phone: normalizePhone(payload.phone) }
      );
      if (existingPhone.records.length > 0) {
        return res.status(409).json({ ok: false, message: "Phone number already registered" });
      }
    }

    const {
      phoneVerifiedToken: _token,
      phone,
      firstName,
      lastName,
      gender,
      birthDate,
      deathDate,
      village,
      vitalStatus,
      ...profile
    } = payload;

    const isDeceased = vitalStatus === "deceased";
    let createdBy: string | null = null;
    // Un proche ajouté sans téléphone (défunt ou enfant mineur) doit être rattaché à son auteur.
    const addingRelativeWithoutPhone = isDeceased || !phone;
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      try {
        createdBy = verifyAccessToken(header.slice("Bearer ".length)).personId;
      } catch {
        if (addingRelativeWithoutPhone) {
          return res.status(401).json({ ok: false, message: "Invalid or expired token" });
        }
      }
    } else if (isDeceased) {
      return res.status(401).json({ ok: false, message: "Authentication required to add a deceased relative" });
    }
    const isUnclaimed = isDeceased || (Boolean(createdBy) && !phone);

    const result = await session.run(
      `
      CREATE (p:Person {
        id: $id,
        firstName: $firstName,
        lastName: $lastName,
        gender: $gender,
        birthDate: $birthDate,
        deathDate: $deathDate,
        village: $village,
        phone: $phone,
        vitalStatus: $vitalStatus,
        accountStatus: $accountStatus,
        createdBy: $createdBy,
        createdAt: datetime()
      })
      SET p += $profile
      RETURN p
      `,
      {
        id: personId,
        firstName,
        lastName,
        gender: gender ?? null,
        birthDate: birthDate ?? null,
        deathDate: deathDate ?? null,
        village: village ?? null,
        phone: phone ? normalizePhone(phone) : null,
        vitalStatus: isDeceased ? "deceased" : "alive",
        accountStatus: isUnclaimed ? "unclaimed" : "active",
        createdBy,
        profile: sanitizePersonFields(profile as Record<string, unknown>)
      }
    );

    const created = result.records[0]?.get("p")?.properties ?? null;
    res.status(201).json({ ok: true, data: created ? publicPerson(created) : null });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to create person",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.put(
  "/:personId",
  requireAuth,
  async (req: AuthenticatedRequest & Request<PersonParams>, res) => {
  const { personId } = req.params;
  const actorId = req.auth!.personId;
  const parsed = updatePersonSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid payload",
      errors: parsed.error.flatten()
    });
  }

  const session = getDriver().session();
  const fields = sanitizePersonFields(parsed.data as Record<string, unknown>);

  delete fields.phone;
  delete fields.pinHash;
  delete fields.refreshTokenHash;
  delete fields.refreshTokenJti;
  delete fields.accountStatus;
  if (actorId === personId || fields.vitalStatus !== "deceased") {
    delete fields.vitalStatus;
  }

  try {
    const allowed = await canCompleteProfile(session, actorId, personId);
    if (!allowed) {
      return res.status(403).json({
        ok: false,
        message:
          "You can only edit your own profile, or a deceased relative you created or who is your parent, child, or sibling"
      });
    }

    const result = await session.run(
      `
      MATCH (p:Person {id: $personId})
      SET p += $fields, p.updatedAt = datetime()
      RETURN p
      `,
      { personId, fields }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    res.json({ ok: true, data: publicPerson(result.records[0].get("p").properties) });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to update person",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.delete(
  "/:personId",
  requireAuth,
  requireSelf("personId"),
  async (req: AuthenticatedRequest & Request<PersonParams>, res) => {
  const { personId } = req.params;
  const session = getDriver().session();

  try {
    const result = await session.run(
      `
      MATCH (p:Person {id: $personId})
      OPTIONAL MATCH (req:RelationshipRequest)
      WHERE req.requesterId = p.id OR req.fromPersonId = p.id OR req.toPersonId = p.id
      DETACH DELETE req, p
      RETURN count(p) AS deletedCount
      `,
      { personId }
    );

    const deletedCount = result.records[0]?.get("deletedCount");
    const deleted =
      typeof deletedCount === "object" && deletedCount !== null && "low" in deletedCount
        ? deletedCount.low
        : Number(deletedCount ?? 0);

    if (deleted === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    res.json({ ok: true, message: "Person deleted", personId });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to delete person",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

export { personsRouter };
