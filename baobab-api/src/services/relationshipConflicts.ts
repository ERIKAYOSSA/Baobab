import { Session } from "neo4j-driver";
import type { UserRelationshipType } from "../schemas/relationship";

export type RelationshipConflict = {
  code: string;
  message: string;
};

const PARENT_TYPES: UserRelationshipType[] = ["FATHER_OF", "MOTHER_OF", "PARENT_OF"];
const SPOUSE_TYPES: UserRelationshipType[] = ["HUSBAND_OF", "WIFE_OF", "MARRIED_TO"];

function genderMismatch(
  type: UserRelationshipType,
  fromGender: string | null | undefined
): RelationshipConflict | null {
  if (!fromGender) return null;
  if (type === "FATHER_OF" && fromGender !== "male") {
    return { code: "GENDER_MISMATCH", message: "FATHER_OF requires a male parent" };
  }
  if (type === "MOTHER_OF" && fromGender !== "female") {
    return { code: "GENDER_MISMATCH", message: "MOTHER_OF requires a female parent" };
  }
  if (type === "HUSBAND_OF" && fromGender !== "male") {
    return { code: "GENDER_MISMATCH", message: "HUSBAND_OF requires a male person" };
  }
  if (type === "WIFE_OF" && fromGender !== "female") {
    return { code: "GENDER_MISMATCH", message: "WIFE_OF requires a female person" };
  }
  if (type === "CO_WIFE_OF" && fromGender !== "female") {
    return { code: "GENDER_MISMATCH", message: "CO_WIFE_OF requires a female person" };
  }
  return null;
}

export async function detectRelationshipConflicts(
  session: Session,
  type: UserRelationshipType,
  fromPersonId: string,
  toPersonId: string
): Promise<RelationshipConflict[]> {
  const conflicts: RelationshipConflict[] = [];

  const persons = await session.run(
    `
    MATCH (a:Person {id: $fromPersonId}), (b:Person {id: $toPersonId})
    RETURN a.gender AS fromGender, b.gender AS toGender
    `,
    { fromPersonId, toPersonId }
  );

  if (persons.records.length === 0) return conflicts;

  const fromGender = persons.records[0].get("fromGender") as string | null;
  const genderConflict = genderMismatch(type, fromGender);
  if (genderConflict) conflicts.push(genderConflict);

  if (PARENT_TYPES.includes(type)) {
    const fatherCheck = await session.run(
      `
      MATCH (child:Person {id: $toPersonId})
      OPTIONAL MATCH (existing:Person)-[r:FATHER_OF]->(child)
      WHERE coalesce(r.official, true) = true
      RETURN existing.id AS existingId
      `,
      { toPersonId }
    );
    const existingFather = fatherCheck.records[0]?.get("existingId") as string | null;
    if (type === "FATHER_OF" && existingFather && existingFather !== fromPersonId) {
      conflicts.push({
        code: "DUPLICATE_FATHER",
        message: "This person already has a registered father"
      });
    }

    const motherCheck = await session.run(
      `
      MATCH (child:Person {id: $toPersonId})
      OPTIONAL MATCH (existing:Person)-[r:MOTHER_OF]->(child)
      WHERE coalesce(r.official, true) = true
      RETURN existing.id AS existingId
      `,
      { toPersonId }
    );
    const existingMother = motherCheck.records[0]?.get("existingId") as string | null;
    if (type === "MOTHER_OF" && existingMother && existingMother !== fromPersonId) {
      conflicts.push({
        code: "DUPLICATE_MOTHER",
        message: "This person already has a registered mother"
      });
    }

    const cycleCheck = await session.run(
      `
      MATCH (parent:Person {id: $fromPersonId}), (child:Person {id: $toPersonId})
      RETURN EXISTS { MATCH (child)-[:FATHER_OF|MOTHER_OF|PARENT_OF*1..10]->(parent) } AS wouldCycle
      `,
      { fromPersonId, toPersonId }
    );
    if (cycleCheck.records[0]?.get("wouldCycle") === true) {
      conflicts.push({
        code: "ANCESTRY_CYCLE",
        message: "This parent link would create an impossible ancestry cycle"
      });
    }
  }

  if (type === "SIBLING_OF") {
    const parentChild = await session.run(
      `
      MATCH (a:Person {id: $fromPersonId}), (b:Person {id: $toPersonId})
      RETURN EXISTS {
        MATCH (a)-[:FATHER_OF|MOTHER_OF|PARENT_OF]->(b)
      } OR EXISTS {
        MATCH (b)-[:FATHER_OF|MOTHER_OF|PARENT_OF]->(a)
      } AS parentChildRelation
      `,
      { fromPersonId, toPersonId }
    );
    if (parentChild.records[0]?.get("parentChildRelation") === true) {
      conflicts.push({
        code: "SIBLING_PARENT_CONFLICT",
        message: "A parent-child pair cannot also be siblings"
      });
    }
  }

  if (SPOUSE_TYPES.includes(type)) {
    const spouseCheck = await session.run(
      `
      MATCH (a:Person {id: $fromPersonId}), (b:Person {id: $toPersonId})
      RETURN EXISTS {
        MATCH (a)-[:HUSBAND_OF|WIFE_OF|MARRIED_TO]-(b)
      } AS alreadySpouses
      `,
      { fromPersonId, toPersonId }
    );
    if (spouseCheck.records[0]?.get("alreadySpouses") === true) {
      conflicts.push({
        code: "DUPLICATE_UNION",
        message: "These persons are already linked as spouses"
      });
    }
  }

  const pendingOpposite = await session.run(
    `
    MATCH (req:RelationshipRequest)
    WHERE req.status IN ['pending', 'contested']
      AND req.type = $type
      AND req.fromPersonId = $toPersonId
      AND req.toPersonId = $fromPersonId
    RETURN req.id AS id
    LIMIT 1
    `,
    { type, fromPersonId, toPersonId }
  );
  if (pendingOpposite.records.length > 0) {
    conflicts.push({
      code: "OPPOSITE_PENDING_REQUEST",
      message: "An opposite pending request already exists for this relationship"
    });
  }

  const contradictoryPending = await session.run(
    `
    MATCH (req:RelationshipRequest)
    WHERE req.status IN ['pending', 'contested']
      AND (
      (req.type IN ['FATHER_OF','MOTHER_OF','PARENT_OF'] AND $type IN ['FATHER_OF','MOTHER_OF','PARENT_OF'] AND req.toPersonId = $toPersonId AND req.fromPersonId <> $fromPersonId)
      OR (req.type = 'SIBLING_OF' AND $type IN ['FATHER_OF','MOTHER_OF','PARENT_OF'] AND ((req.fromPersonId = $toPersonId AND req.toPersonId = $fromPersonId) OR (req.fromPersonId = $fromPersonId AND req.toPersonId = $toPersonId)))
    )
    RETURN req.id AS id, req.type AS type
    LIMIT 1
    `,
    { type, fromPersonId, toPersonId }
  );
  if (contradictoryPending.records.length > 0) {
    const otherType = contradictoryPending.records[0].get("type") as string;
    conflicts.push({
      code: "CONTRADICTORY_PENDING",
      message: `A contradictory pending request exists (${otherType})`
    });
  }

  return conflicts;
}
