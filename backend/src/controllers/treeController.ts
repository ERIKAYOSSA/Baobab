import { Request, Response } from "express";
import { driver } from "../database/database";

export const getTree = async (
  req: Request,
  res: Response
) => {

  const { userId } =
    req.params;

  const session =
    driver.session();

  try {

    const result =
      await session.run(
        `
        MATCH (me:Personne {id:$userId})

        OPTIONAL MATCH
        (parent:Personne)-[:PARENT_DE]->(me)

        OPTIONAL MATCH
        (grandParent:Personne)-[:PARENT_DE]->(parent)

        OPTIONAL MATCH
        (parent)-[:PARENT_DE]->(sibling)

        WHERE sibling.id <> me.id

        OPTIONAL MATCH
        (me)-[:PARENT_DE]->(child)

        OPTIONAL MATCH
        (child)-[:PARENT_DE]->(grandChild)

        RETURN
        me,

        collect(
          DISTINCT parent
        ) AS parents,

        collect(
          DISTINCT grandParent
        ) AS grandParents,

        collect(
          DISTINCT sibling
        ) AS siblings,

        collect(
          DISTINCT child
        ) AS children,

        collect(
          DISTINCT grandChild
        ) AS grandChildren
        `,
        {
          userId
        }
      );

    if (
      result.records.length === 0
    ) {

      return res
        .status(404)
        .json({
          message:
            "Utilisateur introuvable"
        });

    }

    const record =
      result.records[0]!;

    const me =
      record
        .get("me")
        ?.properties;

    res.json({

      me: {

        id:
          me.id,

        nomComplet:
          me.nomComplet,

        dateNaissance:
          me.dateNaissance,

        nationalite:
          me.nationalite,

        region:
          me.region,

        ethnie:
          me.ethnie,

        telephone:
          me.telephone,

        genre:
          me.genre

      },

      parents:
        record
          .get("parents")
          .filter(Boolean)
          .map(
            (p: any) =>
              p.properties
          ),

      grandParents:
        record
          .get("grandParents")
          .filter(Boolean)
          .map(
            (p: any) =>
              p.properties
          ),

      siblings:
        record
          .get("siblings")
          .filter(Boolean)
          .map(
            (p: any) =>
              p.properties
          ),

      children:
        record
          .get("children")
          .filter(Boolean)
          .map(
            (p: any) =>
              p.properties
          ),

      grandChildren:
        record
          .get("grandChildren")
          .filter(Boolean)
          .map(
            (p: any) =>
              p.properties
          )

    });

  } catch (error) {

    console.error(
      "Erreur Tree :",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Erreur récupération arbre"
      });

  } finally {

    await session.close();

  }

};
