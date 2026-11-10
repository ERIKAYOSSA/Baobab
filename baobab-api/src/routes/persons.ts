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
import { syncConsanguinityRelationships } from "../services/consanguinitySync";
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

  const { q, limit = 20, prefix } = parsed.data;
  const session = getDriver().session();

  // Suggestions pendant la saisie : noms qui commencent par q (ex. « er » → Eric, Ernest, Mercier…).
  if (prefix === "true") {
    try {
      const result = await session.run(
        `
        MATCH (p:Person)
        WHERE coalesce(p.vitalStatus, "alive") <> "deceased"
          AND coalesce(p.appearInSuggestions, true) = true
          AND (
               toLower(p.firstName) STARTS WITH toLower($q)
            OR toLower(p.lastName) STARTS WITH toLower($q)
            OR toLower(p.firstName + " " + p.lastName) STARTS WITH toLower($q)
            OR toLower(p.lastName + " " + p.firstName) STARTS WITH toLower($q)
          )
        RETURN p
        ORDER BY p.lastName, p.firstName
        LIMIT $limit
        `,
        { q: q.trim(), limit: neo4j.int(limit) }
      );
      const data = result.records.map((record) => {
        const p = record.get("p").properties as Record<string, unknown>;
        return {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          village: p.village ?? null,
          birthCity: p.birthCity ?? null,
          birthCountry: p.birthCountry ?? null,
          photoUrl: p.photoUrl ?? null
        };
      });
      return res.json({ ok: true, count: data.length, data });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        message: "Failed to search persons",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      await session.close();
    }
  }

  try {
    const result = await session.run(
      `
      MATCH (p:Person)
      WHERE toLower(p.firstName) CONTAINS toLower($q)
         OR toLower(p.lastName) CONTAINS toLower($q)
         OR (p.nickname IS NOT NULL AND toLower(p.nickname) CONTAINS toLower($q))
         OR (p.village IS NOT NULL AND toLower(p.village) CONTAINS toLower($q))
         OR (p.residence IS NOT NULL AND toLower(p.residence) CONTAINS toLower($q))
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

const normText = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");

/** Points communs entre deux personnes (codes lus par la page Découvrir). */
function discoveryMatch(
  me: Record<string, unknown>,
  other: Record<string, unknown>
): { score: number; reasons: string[] } {
  const same = (a: unknown, b: unknown) => normText(a) !== "" && normText(a) === normText(b);
  let score = 0;
  const reasons: string[] = [];
  if (same(me.lastName, other.lastName)) {
    score += 3;
    reasons.push("same_last_name");
  }
  if (
    same(me.birthCity, other.birthCity) ||
    same(me.village, other.village) ||
    same(me.birthCity, other.village) ||
    same(me.village, other.birthCity)
  ) {
    score += 2;
    reasons.push("same_locality");
  }
  if (same(me.birthCountry, other.birthCountry)) {
    score += 1;
    reasons.push("same_country");
  }
  if (same(me.ethnicity, other.ethnicity)) {
    score += 2;
    reasons.push("same_ethnicity");
  }
  if (same(me.clan, other.clan)) {
    score += 1;
    reasons.push("same_clan");
  }
  return { score, reasons };
}

/**
 * Suggestions automatiques : membres actifs qui ont activé « Apparaître dans les suggestions »
 * (activé par défaut), pas encore reliés à moi. Si j'ai activé « Détecter mes liens potentiels »,
 * les plus proches (nom, localité, ethnie…) sont aussi renvoyés dans potentialLinks.
 * Aucune donnée sensible (téléphone…) n'est renvoyée.
 */
personsRouter.get("/discover", requireAuth, async (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.personId;
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (m:Person {id: $meId})
      OPTIONAL MATCH (p:Person)
      WHERE p.id <> $meId
        AND p.phone IS NOT NULL
        AND coalesce(p.accountStatus, "active") = "active"
        AND coalesce(p.vitalStatus, "alive") <> "deceased"
        AND coalesce(p.appearInSuggestions, true) = true
        AND NOT EXISTS { MATCH (m)-[]-(p) }
      WITH m, p
      ORDER BY p.createdAt DESC
      LIMIT 200
      RETURN m, collect(p) AS candidates
      `,
      { meId }
    );

    const record = result.records[0];
    if (!record) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }
    const me = record.get("m").properties as Record<string, unknown>;
    const candidates = (record.get("candidates") as Array<{ properties: Record<string, unknown> } | null>)
      .filter((n): n is { properties: Record<string, unknown> } => Boolean(n));

    const items = candidates
      .map((n) => {
        const p = n.properties;
        const { score, reasons } = discoveryMatch(me, p);
        return {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          village: p.village ?? null,
          birthCity: p.birthCity ?? null,
          birthCountry: p.birthCountry ?? null,
          ethnicity: p.ethnicity ?? null,
          photoUrl: p.photoUrl ?? null,
          score,
          reasons
        };
      })
      .sort((a, b) => b.score - a.score);

    const detectLinks = me.detectLinks !== false;
    const potentialLinks = detectLinks ? items.filter((i) => i.score >= 2).slice(0, 10) : [];
    // Uniquement les profils qui ont au moins un point commun avec moi (pas de liste au hasard).
    const suggestions = items.filter((i) => i.score >= 1).slice(0, 30);

    res.json({ ok: true, data: { suggestions, potentialLinks, detectLinks } });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to load discovery suggestions",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

personsRouter.use("/:personId/consanguinity", consanguinityRouter);

personsRouter.get("/", requireAuth, async (_req, res) => {
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

personsRouter.get("/:personId", requireAuth, async (req: AuthenticatedRequest & Request<PersonParams>, res) => {
  const { personId } = req.params;
  const session = getDriver().session();

  try {
    const result = await session.run(`MATCH (p:Person {id: $personId}) RETURN p`, { personId });
    if (result.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    const found = result.records[0].get("p").properties as Record<string, unknown>;
    res.json({ ok: true, data: publicPerson(found, { includePhone: found.id === req.auth!.personId }) });
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

personsRouter.get("/:personId/family-tree/export", requireAuth, async (req: Request<PersonParams>, res) => {
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

personsRouter.get("/:personId/family-tree", requireAuth, async (req: Request<PersonParams>, res) => {
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

personsRouter.get("/:personId/relationships", requireAuth, async (req: Request<PersonParams>, res) => {
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
      claimPhone,
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

    // Proche vivant sans compte : on retient son numéro pour qu'il récupère son profil en s'inscrivant.
    let claimPhoneNormalized: string | null = null;
    if (claimPhone) {
      if (!createdBy) {
        return res.status(401).json({ ok: false, message: "Authentication required to add a relative" });
      }
      claimPhoneNormalized = normalizePhone(claimPhone);
      const clash = await session.run(
        `
        MATCH (p:Person)
        WHERE p.phone = $phone
           OR (p.claimPhone = $phone AND coalesce(p.accountStatus, "active") = "unclaimed")
        RETURN p.phone IS NOT NULL AS registered
        LIMIT 1
        `,
        { phone: claimPhoneNormalized }
      );
      if (clash.records.length > 0) {
        return res.status(409).json({
          ok: false,
          message: clash.records[0].get("registered")
            ? "Phone number already registered"
            : "A profile is already waiting for this phone number"
        });
      }
    }

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
        claimPhone: $claimPhone,
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
        claimPhone: claimPhoneNormalized,
        vitalStatus: isDeceased ? "deceased" : "alive",
        accountStatus: isUnclaimed ? "unclaimed" : "active",
        createdBy,
        profile: sanitizePersonFields(profile as Record<string, unknown>)
      }
    );

    const created = result.records[0]?.get("p")?.properties ?? null;
    res.status(201).json({ ok: true, data: created ? publicPerson(created, { includePhone: Boolean(phone) }) : null });
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

    res.json({ ok: true, data: publicPerson(result.records[0].get("p").properties, { includePhone: actorId === personId }) });
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

/**
 * Supprime un proche que J'AI ajouté et qui n'a pas de compte (enfant mineur, défunt…) :
 * le profil et tous ses liens disparaissent. Impossible pour un membre qui a un compte.
 */
personsRouter.delete(
  "/:personId/relative",
  requireAuth,
  async (req: AuthenticatedRequest & Request<PersonParams>, res) => {
    const me = req.auth!.personId;
    const { personId } = req.params;
    if (personId === me) {
      return res.status(400).json({ ok: false, message: "Cannot delete yourself with this route" });
    }
    const session = getDriver().session();
    try {
      const found = await session.run(`MATCH (p:Person {id: $personId}) RETURN p`, { personId });
      const person = found.records[0]?.get("p")?.properties as Record<string, unknown> | undefined;
      if (!person) {
        return res.status(404).json({ ok: false, message: "Person not found" });
      }
      if (person.createdBy !== me || (person.accountStatus ?? "active") !== "unclaimed") {
        return res.status(403).json({
          ok: false,
          message: "You can only delete relatives you added who have no account"
        });
      }

      await session.run(
        `
        MATCH (p:Person {id: $personId})
        OPTIONAL MATCH (req:RelationshipRequest)
        WHERE req.fromPersonId = p.id OR req.toPersonId = p.id
        DETACH DELETE req, p
        `,
        { personId }
      );
      await syncConsanguinityRelationships(session);
      res.json({ ok: true, message: "Relative deleted", personId });
    } catch (error) {
      res.status(500).json({
        ok: false,
        message: "Failed to delete relative",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      await session.close();
    }
  }
);

export { personsRouter };
