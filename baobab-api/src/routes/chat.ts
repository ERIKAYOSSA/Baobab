import { Router, type Request } from "express";
import { randomBytes, randomUUID } from "crypto";
import neo4j, { type Session } from "neo4j-driver";
import { z } from "zod";
import { getDriver } from "../db/neo4j";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { autoRelationshipTypes, userRelationshipTypes } from "../schemas/relationship";
import { consumeStreamTicket, issueStreamTicket, pushToPeople, registerStream } from "../services/chatStream";

const chatRouter = Router();

// Flux temps réel : authentifié par un ticket à usage unique (EventSource ne peut pas envoyer d'en-tête).
chatRouter.get("/stream", (req, res) => {
  const ticket = typeof req.query.ticket === "string" ? req.query.ticket : "";
  const personId = consumeStreamTicket(ticket);
  if (!personId) {
    return res.status(401).json({ ok: false, message: "Invalid or expired ticket" });
  }
  registerStream(personId, res);
});

chatRouter.use(requireAuth);

chatRouter.post("/stream-ticket", (req: AuthenticatedRequest, res) => {
  res.json({ ok: true, data: { ticket: issueStreamTicket(req.auth!.personId) } });
});

type IdParams = { id: string };
type ChatRequest = AuthenticatedRequest & Request<IdParams>;

/** Liens familiaux qui relient deux personnes dans l'arbre (proche ou éloigné). */
const FAMILY_TYPES = [...userRelationshipTypes, ...autoRelationshipTypes].join("|");
const MAX_HOPS = 8;

/** Serveur de visioconférence (lien simple ouvert dans un nouvel onglet). Modifiable par variable. */
const CALL_BASE_URL = (process.env.CALL_BASE_URL ?? "https://meet.jit.si").replace(/\/$/, "");

const toNum = (v: unknown): number =>
  typeof v === "object" && v !== null && "low" in v ? (v as { low: number }).low : Number(v ?? 0);

const fail = (res: import("express").Response, status: number, message: string) =>
  res.status(status).json({ ok: false, message });

/** Peut-on discuter avec cette personne ? (compte actif + lié à moi dans l'arbre) */
async function canChat(session: Session, me: string, other: string): Promise<boolean> {
  const r = await session.run(
    `
    MATCH (a:Person {id: $me}), (b:Person {id: $other})
    WHERE coalesce(b.accountStatus, "active") = "active"
      AND b.phone IS NOT NULL
      AND EXISTS { MATCH (a)-[:${FAMILY_TYPES}*1..${MAX_HOPS}]-(b) }
    RETURN count(b) AS n
    `,
    { me, other }
  );
  return toNum(r.records[0]?.get("n")) > 0;
}

async function isMember(session: Session, me: string, id: string): Promise<boolean> {
  const r = await session.run(
    `MATCH (:Person {id: $me})-[:IN_CHAT]->(c:Conversation {id: $id}) RETURN count(c) AS n`,
    { me, id }
  );
  return toNum(r.records[0]?.get("n")) > 0;
}

function parseMeta(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapMessage(m: Record<string, unknown>, createdAt: string, first?: string, last?: string) {
  return {
    id: m.id as string,
    senderId: m.senderId as string,
    senderName: [first, last].filter(Boolean).join(" ") || null,
    kind: (m.kind as string) ?? "text",
    text: (m.text as string) ?? "",
    meta: parseMeta(m.meta),
    createdAt
  };
}

// ---------- Personnes avec qui je peux discuter ----------
chatRouter.get("/contacts", async (req: AuthenticatedRequest, res) => {
  const me = req.auth!.personId;
  const session = getDriver().session();
  try {
    const r = await session.run(
      `
      MATCH (a:Person {id: $me}), (p:Person)
      WHERE p.id <> $me
        AND p.phone IS NOT NULL
        AND coalesce(p.accountStatus, "active") = "active"
        AND EXISTS { MATCH (a)-[:${FAMILY_TYPES}*1..${MAX_HOPS}]-(p) }
      RETURN p
      ORDER BY p.firstName, p.lastName
      LIMIT 300
      `,
      { me }
    );
    const data = r.records.map((rec) => {
      const p = rec.get("p").properties as Record<string, unknown>;
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        photoUrl: p.photoUrl ?? null,
        village: p.village ?? p.birthCity ?? null
      };
    });
    res.json({ ok: true, data });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to load contacts");
  } finally {
    await session.close();
  }
});

// ---------- Nombre total de messages non lus (pastille) ----------
chatRouter.get("/unread", async (req: AuthenticatedRequest, res) => {
  const me = req.auth!.personId;
  const session = getDriver().session();
  try {
    const r = await session.run(
      `
      MATCH (:Person {id: $me})-[mem:IN_CHAT]->(c:Conversation)
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message)
      WHERE m.senderId <> $me AND m.createdAt > mem.lastReadAt
      RETURN count(m) AS unread
      `,
      { me }
    );
    res.json({ ok: true, data: { unread: toNum(r.records[0]?.get("unread")) } });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to count unread");
  } finally {
    await session.close();
  }
});

// ---------- Mes conversations ----------
chatRouter.get("/conversations", async (req: AuthenticatedRequest, res) => {
  const me = req.auth!.personId;
  const session = getDriver().session();
  try {
    const r = await session.run(
      `
      MATCH (:Person {id: $me})-[mem:IN_CHAT]->(c:Conversation)
      CALL {
        WITH c
        OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(x:Message)
        WITH x ORDER BY x.createdAt DESC LIMIT 1
        RETURN x AS last
      }
      CALL {
        WITH c, mem
        OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(y:Message)
        WHERE y.senderId <> $me AND y.createdAt > mem.lastReadAt
        RETURN count(y) AS unread
      }
      CALL {
        WITH c
        MATCH (p:Person)-[:IN_CHAT]->(c)
        RETURN collect({ id: p.id, firstName: p.firstName, lastName: p.lastName, photoUrl: p.photoUrl }) AS members
      }
      RETURN c, last, unread, members,
             toString(last.createdAt) AS lastAt,
             toString(c.createdAt) AS createdAtIso
      ORDER BY coalesce(last.createdAt, c.createdAt) DESC
      `,
      { me }
    );
    const data = r.records.map((rec) => {
      const c = rec.get("c").properties as Record<string, unknown>;
      const last = rec.get("last")?.properties as Record<string, unknown> | undefined;
      return {
        id: c.id as string,
        type: c.type as string,
        name: (c.name as string) ?? null,
        createdAt: rec.get("createdAtIso") as string,
        members: rec.get("members") as Array<Record<string, unknown>>,
        unread: toNum(rec.get("unread")),
        last: last
          ? {
              kind: (last.kind as string) ?? "text",
              text: (last.text as string) ?? "",
              senderId: last.senderId as string,
              createdAt: rec.get("lastAt") as string
            }
          : null
      };
    });
    res.json({ ok: true, data });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to load conversations");
  } finally {
    await session.close();
  }
});

// ---------- Créer une discussion privée ou un groupe ----------
const createSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("direct"), personId: z.string().min(10).max(64) }),
  z.object({
    type: z.literal("group"),
    name: z.string().trim().min(1).max(80),
    memberIds: z.array(z.string().min(10).max(64)).min(1).max(50)
  })
]);

chatRouter.post("/conversations", async (req: AuthenticatedRequest, res) => {
  const me = req.auth!.personId;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid conversation");
  const body = parsed.data;
  const session = getDriver().session();
  try {
    if (body.type === "direct") {
      if (body.personId === me) return fail(res, 400, "Cannot chat with yourself");
      if (!(await canChat(session, me, body.personId))) {
        return fail(res, 403, "You can only chat with members of your family tree");
      }
      const key = [me, body.personId].sort().join(":");
      const r = await session.run(
        `
        MATCH (a:Person {id: $me}), (b:Person {id: $other})
        MERGE (c:Conversation {directKey: $key})
          ON CREATE SET c.id = $id, c.type = "direct", c.createdBy = $me, c.createdAt = datetime()
        MERGE (a)-[r1:IN_CHAT]->(c) ON CREATE SET r1.lastReadAt = datetime(), r1.role = "member"
        MERGE (b)-[r2:IN_CHAT]->(c) ON CREATE SET r2.lastReadAt = datetime(), r2.role = "member"
        RETURN c.id AS id
        `,
        { me, other: body.personId, key, id: randomUUID() }
      );
      return res.json({ ok: true, data: { id: r.records[0].get("id") as string } });
    }

    const memberIds = [...new Set(body.memberIds)].filter((id) => id !== me);
    if (memberIds.length === 0) return fail(res, 400, "Add at least one member");
    for (const id of memberIds) {
      if (!(await canChat(session, me, id))) {
        return fail(res, 403, "Every member must belong to your family tree");
      }
    }
    const id = randomUUID();
    await session.run(
      `
      MATCH (a:Person {id: $me})
      CREATE (c:Conversation {id: $id, type: "group", name: $name, createdBy: $me, createdAt: datetime()})
      CREATE (a)-[:IN_CHAT {lastReadAt: datetime(), role: "admin"}]->(c)
      `,
      { me, id, name: body.name }
    );
    await session.run(
      `
      MATCH (c:Conversation {id: $id})
      UNWIND $memberIds AS mid
      MATCH (p:Person {id: mid})
      CREATE (p)-[:IN_CHAT {lastReadAt: datetime(), role: "member"}]->(c)
      `,
      { id, memberIds }
    );
    res.json({ ok: true, data: { id } });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to create conversation");
  } finally {
    await session.close();
  }
});

// ---------- Messages ----------
chatRouter.get("/conversations/:id/messages", async (req: ChatRequest, res) => {
  const me = req.auth!.personId;
  const { id } = req.params;
  const after = typeof req.query.after === "string" && req.query.after ? req.query.after : null;
  const session = getDriver().session();
  try {
    if (!(await isMember(session, me, id))) return fail(res, 404, "Conversation not found");
    const r = await session.run(
      `
      MATCH (c:Conversation {id: $id})-[:HAS_MESSAGE]->(m:Message)
      WHERE $after IS NULL OR m.createdAt > datetime($after)
      OPTIONAL MATCH (s:Person {id: m.senderId})
      RETURN m, toString(m.createdAt) AS createdAtIso, s.firstName AS fn, s.lastName AS ln
      ORDER BY m.createdAt DESC
      LIMIT $limit
      `,
      { id, after, limit: neo4j.int(100) }
    );
    const data = r.records
      .map((rec) =>
        mapMessage(rec.get("m").properties, rec.get("createdAtIso") as string, rec.get("fn"), rec.get("ln"))
      )
      .reverse();
    await session.run(
      `MATCH (:Person {id: $me})-[mem:IN_CHAT]->(:Conversation {id: $id}) SET mem.lastReadAt = datetime()`,
      { me, id }
    );
    res.json({ ok: true, data });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to load messages");
  } finally {
    await session.close();
  }
});

async function postMessage(
  session: Session,
  me: string,
  conversationId: string,
  kind: "text" | "call" | "meeting",
  text: string,
  meta: Record<string, unknown> | null
) {
  const r = await session.run(
    `
    MATCH (c:Conversation {id: $id})
    CREATE (m:Message {id: $mid, conversationId: $id, senderId: $me, text: $text, kind: $kind, meta: $meta, createdAt: datetime()})
    CREATE (c)-[:HAS_MESSAGE]->(m)
    WITH m
    MATCH (p:Person {id: $me})
    RETURN m, toString(m.createdAt) AS createdAtIso, p.firstName AS fn, p.lastName AS ln
    `,
    { id: conversationId, mid: randomUUID(), me, text, kind, meta: meta ? JSON.stringify(meta) : null }
  );
  await session.run(
    `MATCH (:Person {id: $me})-[mem:IN_CHAT]->(:Conversation {id: $id}) SET mem.lastReadAt = datetime()`,
    { me, id: conversationId }
  );
  const rec = r.records[0];
  const message = mapMessage(rec.get("m").properties, rec.get("createdAtIso") as string, rec.get("fn"), rec.get("ln"));

  // Envoi instantané à tous les membres connectés.
  const members = await session.run(
    `MATCH (p:Person)-[:IN_CHAT]->(:Conversation {id: $id}) RETURN p.id AS id`,
    { id: conversationId }
  );
  pushToPeople(
    members.records.map((m) => m.get("id") as string),
    "chat",
    { conversationId, message }
  );
  return message;
}

const textSchema = z.object({ text: z.string().trim().min(1).max(2000) });

chatRouter.post("/conversations/:id/messages", async (req: ChatRequest, res) => {
  const me = req.auth!.personId;
  const { id } = req.params;
  const parsed = textSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Message must be 1 to 2000 characters");
  const session = getDriver().session();
  try {
    if (!(await isMember(session, me, id))) return fail(res, 404, "Conversation not found");
    const message = await postMessage(session, me, id, "text", parsed.data.text, null);
    res.status(201).json({ ok: true, data: message });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to send message");
  } finally {
    await session.close();
  }
});

const newRoom = () => `baobab-${randomBytes(8).toString("hex")}`;

// ---------- Appel audio / vidéo : partage un lien de salle ----------
chatRouter.post("/conversations/:id/call", async (req: ChatRequest, res) => {
  const me = req.auth!.personId;
  const { id } = req.params;
  const audioOnly = req.body?.audioOnly === true;
  const session = getDriver().session();
  try {
    if (!(await isMember(session, me, id))) return fail(res, 404, "Conversation not found");
    const room = newRoom();
    const message = await postMessage(session, me, id, "call", "", {
      room,
      audioOnly,
      url: `${CALL_BASE_URL}/${room}`
    });
    res.status(201).json({ ok: true, data: message });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to start call");
  } finally {
    await session.close();
  }
});

// ---------- Réunion de famille planifiée ----------
const meetingSchema = z.object({
  title: z.string().trim().min(1).max(120),
  startsAt: z.string().datetime({ offset: true }),
  audioOnly: z.boolean().optional()
});

chatRouter.post("/conversations/:id/meetings", async (req: ChatRequest, res) => {
  const me = req.auth!.personId;
  const { id } = req.params;
  const parsed = meetingSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "A title and a valid date are required");
  if (new Date(parsed.data.startsAt).getTime() < Date.now() - 5 * 60_000) {
    return fail(res, 400, "The meeting date must be in the future");
  }
  const session = getDriver().session();
  try {
    if (!(await isMember(session, me, id))) return fail(res, 404, "Conversation not found");
    const room = newRoom();
    const message = await postMessage(session, me, id, "meeting", parsed.data.title, {
      title: parsed.data.title,
      startsAt: parsed.data.startsAt,
      room,
      audioOnly: parsed.data.audioOnly === true,
      url: `${CALL_BASE_URL}/${room}`
    });
    res.status(201).json({ ok: true, data: message });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to schedule meeting");
  } finally {
    await session.close();
  }
});

// ---------- Marquer une discussion comme lue ----------
chatRouter.post("/conversations/:id/read", async (req: ChatRequest, res) => {
  const me = req.auth!.personId;
  const session = getDriver().session();
  try {
    await session.run(
      `MATCH (:Person {id: $me})-[mem:IN_CHAT]->(:Conversation {id: $id}) SET mem.lastReadAt = datetime()`,
      { me, id: req.params.id }
    );
    res.json({ ok: true });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to mark as read");
  } finally {
    await session.close();
  }
});

// ---------- Quitter une discussion ----------
chatRouter.post("/conversations/:id/leave", async (req: ChatRequest, res) => {
  const me = req.auth!.personId;
  const { id } = req.params;
  const session = getDriver().session();
  try {
    if (!(await isMember(session, me, id))) return fail(res, 404, "Conversation not found");
    await session.run(`MATCH (:Person {id: $me})-[mem:IN_CHAT]->(:Conversation {id: $id}) DELETE mem`, { me, id });
    // Plus aucun membre : on supprime la conversation et ses messages.
    await session.run(
      `
      MATCH (c:Conversation {id: $id})
      WHERE NOT EXISTS { MATCH (:Person)-[:IN_CHAT]->(c) }
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message)
      DETACH DELETE m, c
      `,
      { id }
    );
    res.json({ ok: true });
  } catch (error) {
    fail(res, 500, error instanceof Error ? error.message : "Failed to leave conversation");
  } finally {
    await session.close();
  }
});

export { chatRouter };
