import { Router } from "express";
import type { Request } from "express";
import { getDriver } from "../db/neo4j";

type ConsanguinityParams = { personId: string };

const consanguinityRouter = Router({ mergeParams: true });

function mapNodes(nodes: unknown[]) {
  return nodes
    .filter((node): node is { properties: Record<string, unknown> } => node !== null)
    .map((node) => node.properties);
}

consanguinityRouter.get("/", async (req: Request<ConsanguinityParams>, res) => {
  const { personId } = req.params;
  const session = getDriver().session();

  try {
    const personCheck = await session.run(
      `MATCH (p:Person {id: $personId}) RETURN p`,
      { personId }
    );

    if (personCheck.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    const result = await session.run(
      `
      MATCH (p:Person {id: $personId})
      OPTIONAL MATCH (father:Person)-[:FATHER_OF]->(p)
      OPTIONAL MATCH (mother:Person)-[:MOTHER_OF]->(p)
      OPTIONAL MATCH (legacyParent:Person)-[:PARENT_OF]->(p)
      OPTIONAL MATCH (p)-[:FATHER_OF]->(childAsFather:Person)
      OPTIONAL MATCH (p)-[:MOTHER_OF]->(childAsMother:Person)
      OPTIONAL MATCH (p)-[:PARENT_OF]->(childLegacy:Person)
      OPTIONAL MATCH (p)-[:WIFE_OF]->(husband:Person)
      OPTIONAL MATCH (wife:Person)-[:WIFE_OF]->(p)
      OPTIONAL MATCH (p)-[:HUSBAND_OF]->(wifeFromHusband:Person)
      OPTIONAL MATCH (p)-[:MARRIED_TO]-(spouseMarried:Person)
      OPTIONAL MATCH (p)-[:CO_WIFE_OF]-(coWife:Person)
      OPTIONAL MATCH (p)-[:FULL_SIBLING_OF]-(fullSibling:Person)
      OPTIONAL MATCH (p)-[halfRel:HALF_SIBLING_OF]-(halfSibling:Person)
      OPTIONAL MATCH (p)-[:SIBLING_OF]-(claimedSibling:Person)
      OPTIONAL MATCH (p)-[cousinRel:COUSIN_OF]-(cousin:Person)
      RETURN
        collect(DISTINCT father) AS fathers,
        collect(DISTINCT mother) AS mothers,
        collect(DISTINCT legacyParent) AS legacyParents,
        collect(DISTINCT childAsFather) AS childrenAsFather,
        collect(DISTINCT childAsMother) AS childrenAsMother,
        collect(DISTINCT childLegacy) AS childrenLegacy,
        collect(DISTINCT husband) AS husbandsFromWife,
        collect(DISTINCT wife) AS wives,
        collect(DISTINCT wifeFromHusband) AS wivesFromHusband,
        collect(DISTINCT spouseMarried) AS spousesMarried,
        collect(DISTINCT coWife) AS coWives,
        collect(DISTINCT fullSibling) AS fullSiblings,
        collect(DISTINCT halfSibling) AS halfSiblings,
        collect(DISTINCT claimedSibling) AS claimedSiblings,
        collect(DISTINCT cousin) AS cousins,
        collect(DISTINCT {person: halfSibling, sharedLine: halfRel.sharedLine}) AS halfSiblingMeta,
        collect(DISTINCT {person: cousin, line: cousinRel.line, degree: cousinRel.degree}) AS cousinMeta
      `,
      { personId }
    );

    const record = result.records[0];
    const halfMeta = (record.get("halfSiblingMeta") as Array<{
      person: { properties: Record<string, unknown> } | null;
      sharedLine: string;
    }>).filter((x) => x.person);
    const cousinMeta = (record.get("cousinMeta") as Array<{
      person: { properties: Record<string, unknown> } | null;
      line: string;
      degree: number;
    }>).filter((x) => x.person);

    const halfPaternal = halfMeta
      .filter((x) => x.sharedLine === "paternal")
      .map((x) => x.person!.properties);
    const halfMaternal = halfMeta
      .filter((x) => x.sharedLine === "maternal")
      .map((x) => x.person!.properties);

    const cousinsByLine = {
      paternal: cousinMeta.filter((x) => x.line === "paternal").map((x) => x.person!.properties),
      maternal: cousinMeta.filter((x) => x.line === "maternal").map((x) => x.person!.properties),
      both: cousinMeta.filter((x) => x.line === "both").map((x) => x.person!.properties)
    };

    res.json({
      ok: true,
      personId,
      data: {
        lineage: {
          fathers: mapNodes(record.get("fathers")),
          mothers: mapNodes(record.get("mothers")),
          legacyParents: mapNodes(record.get("legacyParents"))
        },
        children: {
          asFather: mapNodes(record.get("childrenAsFather")),
          asMother: mapNodes(record.get("childrenAsMother")),
          legacy: mapNodes(record.get("childrenLegacy"))
        },
        unions: {
          wives: mapNodes(record.get("wives")).concat(mapNodes(record.get("wivesFromHusband"))),
          husbands: mapNodes(record.get("husbandsFromWife")),
          spouses: mapNodes(record.get("spousesMarried")),
          coWives: mapNodes(record.get("coWives"))
        },
        siblings: {
          full: mapNodes(record.get("fullSiblings")),
          halfPaternal,
          halfMaternal,
          declared: mapNodes(record.get("claimedSiblings"))
        },
        cousins: cousinsByLine
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch consanguinity",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

export { consanguinityRouter };
