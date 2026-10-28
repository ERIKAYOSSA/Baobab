import { randomUUID } from "crypto";
import { Session } from "neo4j-driver";
import type { UserRelationshipType } from "../schemas/relationship";
import { syncConsanguinityRelationships } from "./consanguinitySync";

const FAMILY_GRAPH_RELS =
  "PARENT_OF|FATHER_OF|MOTHER_OF|HUSBAND_OF|WIFE_OF|MARRIED_TO|CO_WIFE_OF|SIBLING_OF|FULL_SIBLING_OF|HALF_SIBLING_OF|COUSIN_OF";

type PersonRef = {
  id: string;
  vitalStatus?: string | null;
  accountStatus?: string | null;
};

const DIRECT_KIN_RELS = "FATHER_OF|MOTHER_OF|PARENT_OF|SIBLING_OF|FULL_SIBLING_OF|HALF_SIBLING_OF";

const LINK_LABELS: Record<string, string> = {
  FATHER_OF: "Père",
  MOTHER_OF: "Mère",
  PARENT_OF: "Parent",
  HUSBAND_OF: "Époux",
  WIFE_OF: "Épouse",
  MARRIED_TO: "Conjoint",
  CO_WIFE_OF: "Co-épouse",
  SIBLING_OF: "Frère/sœur"
};

/** Disagreements between parties — not impossible graphs. Resolved by appellation, not a hard reject. */
export const PARTY_CONFLICT_CODES = new Set([
  "DUPLICATE_FATHER",
  "DUPLICATE_MOTHER",
  "OPPOSITE_PENDING_REQUEST",
  "CONTRADICTORY_PENDING",
  "DUPLICATE_UNION"
]);

export function partyAppellation(type: string, partyName: string): string {
  const label = LINK_LABELS[type] ?? type;
  const name = partyName.trim() || "un membre";
  return `${label} selon ${name}`;
}

export async function getFamilyMembers(session: Session, personId: string): Promise<PersonRef[]> {
  const result = await session.run(
    `
    MATCH (seed:Person {id: $personId})
    MATCH (p:Person)
    WHERE p.id = seed.id
       OR (seed)-[:${FAMILY_GRAPH_RELS}*1..20]-(p)
       OR (p)-[:${FAMILY_GRAPH_RELS}*1..20]-(seed)
    RETURN DISTINCT p.id AS id, p.vitalStatus AS vitalStatus, p.accountStatus AS accountStatus
    `,
    { personId }
  );

  return result.records.map((record) => ({
    id: record.get("id") as string,
    vitalStatus: record.get("vitalStatus") as string | null,
    accountStatus: record.get("accountStatus") as string | null
  }));
}

function canVote(member: PersonRef): boolean {
  if (member.vitalStatus === "deceased") return false;
  if (member.accountStatus === "invited" || member.accountStatus === "unclaimed") return false;
  return true;
}

export async function getRequiredApprovers(
  session: Session,
  requesterId: string,
  anchorPersonId: string
): Promise<string[]> {
  const requesterResult = await session.run(
    `MATCH (p:Person {id: $requesterId}) RETURN p.id AS id`,
    { requesterId }
  );

  if (requesterResult.records.length === 0) {
    throw new Error("REQUESTER_NOT_FOUND");
  }

  const familyFromAnchor = await getFamilyMembers(session, anchorPersonId);
  const familyFromRequester = await getFamilyMembers(session, requesterId);

  const byId = new Map<string, PersonRef>();
  for (const member of [...familyFromAnchor, ...familyFromRequester]) {
    byId.set(member.id, member);
  }

  return [...byId.values()]
    .filter((member) => member.id !== requesterId)
    .filter(canVote)
    .map((member) => member.id)
    .sort();
}

/** Parents, children, and siblings (sisters and brothers, including half). */
export async function isDirectKin(
  session: Session,
  actorId: string,
  targetId: string
): Promise<boolean> {
  const result = await session.run(
    `
    MATCH (actor:Person {id: $actorId}), (target:Person {id: $targetId})
    RETURN EXISTS {
      MATCH (actor)-[:${DIRECT_KIN_RELS}]-(target)
    } AS kin
    `,
    { actorId, targetId }
  );
  return result.records[0]?.get("kin") === true;
}

export async function canCompleteProfile(
  session: Session,
  actorId: string,
  targetId: string
): Promise<boolean> {
  if (actorId === targetId) return true;
  const result = await session.run(
    `
    MATCH (target:Person {id: $targetId})
    RETURN target.vitalStatus AS vitalStatus, target.createdBy AS createdBy
    `,
    { targetId }
  );
  if (result.records.length === 0) return false;
  const vitalStatus = result.records[0].get("vitalStatus") as string | null;
  const createdBy = result.records[0].get("createdBy") as string | null;
  if (vitalStatus !== "deceased") return false;
  if (createdBy === actorId) return true;
  return isDirectKin(session, actorId, targetId);
}

export async function relationshipExists(
  session: Session,
  type: UserRelationshipType,
  fromPersonId: string,
  toPersonId: string
): Promise<boolean> {
  const result = await session.run(
    `
    MATCH (a:Person {id: $fromPersonId})-[r:${type}]->(b:Person {id: $toPersonId})
    RETURN r
  LIMIT 1
    `,
    { fromPersonId, toPersonId }
  );
  return result.records.length > 0;
}

export async function pendingRequestExists(
  session: Session,
  type: UserRelationshipType,
  fromPersonId: string,
  toPersonId: string
): Promise<boolean> {
  const result = await session.run(
    `
    MATCH (req:RelationshipRequest)
    WHERE req.status IN ['pending', 'contested']
      AND req.type = $type
      AND req.fromPersonId = $fromPersonId
      AND req.toPersonId = $toPersonId
    RETURN req
    LIMIT 1
    `,
    { type, fromPersonId, toPersonId }
  );
  return result.records.length > 0;
}

export async function createConfirmedRelationship(
  session: Session,
  type: UserRelationshipType,
  fromPersonId: string,
  toPersonId: string
): Promise<{
  consanguinity: { fullSiblings: number; halfSiblings: number; cousins: number };
}> {
  await session.run(
    `
    MATCH (a:Person {id: $fromPersonId}), (b:Person {id: $toPersonId})
    CREATE (a)-[r:${type} {createdAt: datetime()}]->(b)
    `,
    { fromPersonId, toPersonId }
  );

const consanguinity = await syncConsanguinityRelationships(session);
  return { consanguinity };
}

const CONTESTED_PROCEDURE =
  "Votes partagés : le lien officiel n'est pas créé et l'existant n'est pas écrasé. Chaque parti garde son appellation (ex. « Père selon Amina »). L'autre parti dépose sa propre version sous son nom.";

async function createPartyView(
  session: Session,
  type: UserRelationshipType,
  fromPersonId: string,
  toPersonId: string,
  appellation: string,
  partyPersonId: string
): Promise<void> {
  await session.run(
    `
    MATCH (a:Person {id: $fromPersonId}), (b:Person {id: $toPersonId})
    CREATE (a)-[:${type} {
      createdAt: datetime(),
      official: false,
      partyAppellation: $appellation,
      partyPersonId: $partyPersonId
    }]->(b)
    `,
    { fromPersonId, toPersonId, appellation, partyPersonId }
  );
}

function neoCount(value: unknown): number {
  if (typeof value === "object" && value !== null && "low" in value) {
    return (value as { low: number }).low;
  }
  return Number(value ?? 0);
}

export async function createRelationshipRequest(
  session: Session,
  input: {
    type: UserRelationshipType;
    requesterId: string;
    fromPersonId: string;
    toPersonId: string;
    appellation?: string;
    partyConflictCodes?: string[];
  }
): Promise<{
  requestId: string;
  status: "pending" | "approved" | "contested";
  requiredApprovers: string[];
  autoApproved: boolean;
  appellation?: string;
  procedure?: string;
}> {
  const { type, requesterId, fromPersonId, toPersonId, appellation, partyConflictCodes } = input;
  const anchorPersonId = requesterId === fromPersonId ? toPersonId : fromPersonId;
  const requiredApprovers = await getRequiredApprovers(session, requesterId, anchorPersonId);
  const requestId = randomUUID();
  const partyDisagreement = Boolean(partyConflictCodes?.length);

  if (requiredApprovers.length === 0 && !partyDisagreement) {
    await createConfirmedRelationship(session, type, fromPersonId, toPersonId);
    await session.run(
      `
      MATCH (requester:Person {id: $requesterId})
      CREATE (req:RelationshipRequest {
        id: $requestId,
        type: $type,
        requesterId: $requesterId,
        fromPersonId: $fromPersonId,
        toPersonId: $toPersonId,
        status: 'approved',
        autoApproved: true,
        createdAt: datetime(),
        decidedAt: datetime()
      })
      CREATE (requester)-[:SUBMITTED]->(req)
      `,
      { requestId, type, requesterId, fromPersonId, toPersonId }
    );

    return { requestId, status: "approved", requiredApprovers: [], autoApproved: true };
  }

  if (requiredApprovers.length === 0 && partyDisagreement) {
    await createPartyView(session, type, fromPersonId, toPersonId, appellation ?? partyAppellation(type, "un membre"), requesterId);
    await session.run(
      `
      MATCH (requester:Person {id: $requesterId})
      CREATE (req:RelationshipRequest {
        id: $requestId,
        type: $type,
        requesterId: $requesterId,
        fromPersonId: $fromPersonId,
        toPersonId: $toPersonId,
        status: 'contested',
        autoApproved: false,
        appellation: $appellation,
        conflictCodes: $conflictCodes,
        procedure: $procedure,
        createdAt: datetime(),
        decidedAt: datetime()
      })
      CREATE (requester)-[:SUBMITTED]->(req)
      `,
      {
        requestId,
        type,
        requesterId,
        fromPersonId,
        toPersonId,
        appellation: appellation ?? null,
        conflictCodes: partyConflictCodes ?? [],
        procedure: CONTESTED_PROCEDURE
      }
    );
    return {
      requestId,
      status: "contested",
      requiredApprovers: [],
      autoApproved: false,
      appellation,
      procedure: CONTESTED_PROCEDURE
    };
  }

  await session.run(
    `
    MATCH (requester:Person {id: $requesterId})
    CREATE (req:RelationshipRequest {
      id: $requestId,
      type: $type,
      requesterId: $requesterId,
      fromPersonId: $fromPersonId,
      toPersonId: $toPersonId,
      status: 'pending',
      autoApproved: false,
      appellation: $appellation,
      conflictCodes: $conflictCodes,
      createdAt: datetime()
    })
    CREATE (requester)-[:SUBMITTED]->(req)
    WITH req
    UNWIND $requiredApprovers AS approverId
    MATCH (approver:Person {id: approverId})
    CREATE (approver)-[:MUST_APPROVE {status: 'pending', createdAt: datetime()}]->(req)
    `,
    {
      requestId,
      type,
      requesterId,
      fromPersonId,
      toPersonId,
      requiredApprovers,
      appellation: appellation ?? null,
      conflictCodes: partyConflictCodes ?? []
    }
  );

  return { requestId, status: "pending", requiredApprovers, autoApproved: false, appellation };
}

export async function decideOnRequest(
  session: Session,
  requestId: string,
  approverId: string,
  decision: "approved" | "rejected"
): Promise<{
  status: string;
  finalized: boolean;
  consanguinity?: { fullSiblings: number; halfSiblings: number; cousins: number };
}> {
  const check = await session.run(
    `
    MATCH (approver:Person {id: $approverId})-[a:MUST_APPROVE]->(req:RelationshipRequest {id: $requestId})
    RETURN req.status AS requestStatus, a.status AS approvalStatus
    `,
    { requestId, approverId }
  );

  if (check.records.length === 0) {
    throw new Error("APPROVAL_NOT_REQUIRED");
  }

  const requestStatus = check.records[0].get("requestStatus") as string;
  if (requestStatus !== "pending") {
    throw new Error("REQUEST_ALREADY_CLOSED");
  }

  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("INVALID_DECISION");
  }

  await session.run(
    `
    MATCH (approver:Person {id: $approverId})-[a:MUST_APPROVE]->(req:RelationshipRequest {id: $requestId})
    SET a.status = $decision, a.decidedAt = datetime()
    `,
    { requestId, approverId, decision }
  );

  const counts = await session.run(
    `
    MATCH (req:RelationshipRequest {id: $requestId})
    OPTIONAL MATCH ()-[a:MUST_APPROVE]->(req)
    RETURN req.type AS type,
      req.fromPersonId AS fromPersonId,
      req.toPersonId AS toPersonId,
      req.requesterId AS requesterId,
      req.appellation AS appellation,
      req.conflictCodes AS conflictCodes,
      count(CASE WHEN a.status = 'pending' THEN 1 END) AS pendingCount,
      count(CASE WHEN a.status = 'approved' THEN 1 END) AS approvedCount,
      count(CASE WHEN a.status = 'rejected' THEN 1 END) AS rejectedCount
    `,
    { requestId }
  );

  const row = counts.records[0];
  const pendingValue = neoCount(row?.get("pendingCount"));
  if (pendingValue > 0) {
    return { status: "pending", finalized: false };
  }

  const approvedValue = neoCount(row?.get("approvedCount"));
  const rejectedValue = neoCount(row?.get("rejectedCount"));
  const type = row?.get("type") as UserRelationshipType;
  const fromPersonId = row?.get("fromPersonId") as string;
  const toPersonId = row?.get("toPersonId") as string;
  const requesterId = row?.get("requesterId") as string;
  const appellation = (row?.get("appellation") as string | null) ?? undefined;
  const conflictCodes = (row?.get("conflictCodes") as string[] | null) ?? [];
  const partyDisagreement = conflictCodes.some((code) => PARTY_CONFLICT_CODES.has(code));

  if (rejectedValue === 0 && approvedValue > 0 && !partyDisagreement) {
    const { consanguinity } = await createConfirmedRelationship(session, type, fromPersonId, toPersonId);
    await session.run(
      `
      MATCH (req:RelationshipRequest {id: $requestId})
      SET req.status = 'approved', req.decidedAt = datetime()
      `,
      { requestId }
    );
    return { status: "approved", finalized: true, consanguinity };
  }

  if (rejectedValue === 0 && approvedValue > 0 && partyDisagreement) {
    await createPartyView(
      session,
      type,
      fromPersonId,
      toPersonId,
      appellation ?? partyAppellation(type, "un membre"),
      requesterId
    );
    await session.run(
      `
      MATCH (req:RelationshipRequest {id: $requestId})
      SET req.status = 'contested', req.procedure = $procedure, req.decidedAt = datetime()
      `,
      { requestId, procedure: CONTESTED_PROCEDURE }
    );
    return { status: "contested", finalized: true };
  }

  if (approvedValue === 0 && rejectedValue > 0) {
    await session.run(
      `
      MATCH (req:RelationshipRequest {id: $requestId})
      SET req.status = 'rejected', req.decidedAt = datetime()
      `,
      { requestId }
    );
    return { status: "rejected", finalized: true };
  }

  await session.run(
    `
    MATCH (req:RelationshipRequest {id: $requestId})
    SET req.status = 'contested', req.procedure = $procedure, req.decidedAt = datetime()
    `,
    { requestId, procedure: CONTESTED_PROCEDURE }
  );
  return { status: "contested", finalized: true };
}

export async function getRequestById(session: Session, requestId: string) {
  const result = await session.run(
    `
    MATCH (req:RelationshipRequest {id: $requestId})
    OPTIONAL MATCH (approver:Person)-[a:MUST_APPROVE]->(req)
    RETURN req,
      collect({
        approverId: approver.id,
        firstName: approver.firstName,
        lastName: approver.lastName,
        status: a.status,
        decidedAt: a.decidedAt
      }) AS approvals
    `,
    { requestId }
  );

  if (result.records.length === 0) return null;

  const record = result.records[0];
  const req = record.get("req").properties as Record<string, unknown>;
  const approvals = (record.get("approvals") as Array<Record<string, unknown>>).filter(
    (a) => a.approverId !== null
  );

  const pending = approvals.filter((a) => a.status === "pending").length;
  const approved = approvals.filter((a) => a.status === "approved").length;

  return {
    ...req,
    approvals,
    approvalSummary: {
      total: approvals.length,
      pending,
      approved,
      rejected: approvals.filter((a) => a.status === "rejected").length
    }
  };
}

export async function listPendingForApprover(session: Session, approverId: string) {
  const result = await session.run(
    `
    MATCH (approver:Person {id: $approverId})-[a:MUST_APPROVE {status: 'pending'}]->(req:RelationshipRequest {status: 'pending'})
    MATCH (requester:Person {id: req.requesterId})
    RETURN req, requester
    ORDER BY req.createdAt DESC
    `,
    { approverId }
  );

  return result.records.map((record) => ({
    request: record.get("req").properties,
    requester: record.get("requester").properties
  }));
}

export { FAMILY_GRAPH_RELS };
