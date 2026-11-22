import { Session } from "neo4j-driver";
import { listPendingForApprover } from "./familyApproval";

/**
 * Une personne nommée dans une demande (ex. une mère ajoutée par son enfant avant d'avoir un compte)
 * doit pouvoir la voir et la confirmer dès qu'elle a un compte actif.
 */
async function attachPartyApprovals(session: Session, personId: string) {
  await session.run(
    `
    MATCH (me:Person {id: $personId})
    WHERE coalesce(me.accountStatus, "active") = "active"
      AND coalesce(me.vitalStatus, "alive") <> "deceased"
      AND me.phone IS NOT NULL
    MATCH (req:RelationshipRequest {status: "pending"})
    WHERE (req.fromPersonId = $personId OR req.toPersonId = $personId)
      AND req.requesterId <> $personId
      AND NOT EXISTS { MATCH (me)-[:MUST_APPROVE]->(req) }
    CREATE (me)-[:MUST_APPROVE {status: "pending", createdAt: datetime()}]->(req)
    `,
    { personId }
  );
}

export async function getNotifications(session: Session, personId: string) {
  await attachPartyApprovals(session, personId);
  const pendingApprovals = await listPendingForApprover(session, personId);

  const myRequests = await session.run(
    `
    MATCH (req:RelationshipRequest {requesterId: $personId})
    OPTIONAL MATCH (approver:Person)-[a:MUST_APPROVE]->(req)
    RETURN req,
      count(CASE WHEN a.status = 'pending' THEN 1 END) AS pendingVotes,
      count(CASE WHEN a.status = 'approved' THEN 1 END) AS approvedVotes,
      count(a) AS totalVotes,
      collect(
        CASE WHEN approver IS NULL THEN NULL ELSE {
          id: approver.id,
          firstName: approver.firstName,
          lastName: approver.lastName,
          status: a.status,
          decidedAt: toString(a.decidedAt)
        } END
      ) AS votes
    ORDER BY req.createdAt DESC
    LIMIT 20
    `,
    { personId }
  );

  const toNum = (v: unknown) =>
    typeof v === "object" && v !== null && "low" in v ? (v as { low: number }).low : Number(v ?? 0);
  const iso = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

  // Noms des personnes citées dans les demandes (jamais de téléphone ni de PIN).
  const ids = new Set<string>();
  for (const item of pendingApprovals) {
    ids.add(item.request.fromPersonId as string);
    ids.add(item.request.toPersonId as string);
  }
  const myRows = myRequests.records.map((record) => ({
    record,
    req: record.get("req").properties as Record<string, unknown>
  }));
  for (const { req } of myRows) {
    ids.add(req.fromPersonId as string);
    ids.add(req.toPersonId as string);
  }
  const people = new Map<string, Record<string, unknown>>();
  if (ids.size > 0) {
    const found = await session.run(`MATCH (p:Person) WHERE p.id IN $ids RETURN p`, { ids: [...ids] });
    for (const r of found.records) {
      const p = r.get("p").properties as Record<string, unknown>;
      people.set(p.id as string, p);
    }
  }
  const brief = (p: Record<string, unknown> | undefined | null) =>
    p
      ? {
          id: p.id as string,
          firstName: (p.firstName as string) ?? "",
          lastName: (p.lastName as string) ?? "",
          village: (p.village as string) ?? null,
          birthCity: (p.birthCity as string) ?? null,
          birthCountry: (p.birthCountry as string) ?? null,
          ethnicity: (p.ethnicity as string) ?? null,
          photoUrl: (p.photoUrl as string) ?? null
        }
      : null;

  return {
    pendingApprovals: pendingApprovals.map((item) => ({
      type: "approval_required" as const,
      requestId: item.request.id as string,
      requestType: item.request.type as string,
      requester: brief(item.requester),
      from: brief(people.get(item.request.fromPersonId as string)),
      to: brief(people.get(item.request.toPersonId as string)),
      createdAt: iso(item.request.createdAt)
    })),
    myRequests: myRows.map(({ record, req }) => ({
      type: "my_request" as const,
      requestId: req.id as string,
      status: req.status as string,
      relationshipType: req.type as string,
      fromPersonId: req.fromPersonId as string,
      toPersonId: req.toPersonId as string,
      from: brief(people.get(req.fromPersonId as string)),
      to: brief(people.get(req.toPersonId as string)),
      pendingVotes: toNum(record.get("pendingVotes")),
      approvedVotes: toNum(record.get("approvedVotes")),
      totalVotes: toNum(record.get("totalVotes")),
      // Qui a répondu quoi (et quand) : affiché à la personne qui a fait la demande.
      votes: (record.get("votes") as Array<Record<string, unknown>>).map((v) => ({
        id: v.id as string,
        firstName: (v.firstName as string) ?? "",
        lastName: (v.lastName as string) ?? "",
        status: v.status as string,
        decidedAt: (v.decidedAt as string) ?? null
      })),
      decidedAt: iso(req.decidedAt),
      createdAt: iso(req.createdAt)
    })),
    summary: {
      pendingApprovalsCount: pendingApprovals.length,
      myPendingRequestsCount: myRows.filter(({ req }) => req.status === "pending").length
    }
  };
}
