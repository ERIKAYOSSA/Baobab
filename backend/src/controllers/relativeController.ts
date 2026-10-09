import { Request, Response } from "express";
import { driver } from "../database/database";
import crypto from "crypto";

export const addRelative = async (
  req: Request,
  res: Response
) => {

  const {
    userId,
    nomComplet,
    dateNaissance,
    paysOrigine,
    ethnie,
    relation
  } = req.body;

  const session =
    driver.session();

  try {

    const relativeId =
      crypto.randomUUID();

    let query = "";

    switch (
      relation
    ) {

      case "PERE":

      case "MERE":

        query = `
        MATCH (me:Personne {id:$userId})

        CREATE (
          relative:Personne {
            id:$relativeId,
            nomComplet:$nomComplet,
            dateNaissance:$dateNaissance,
            paysOrigine:$paysOrigine,
            ethnie:$ethnie
          }
        )

        CREATE
        (relative)-[:PARENT_DE]->(me)

        RETURN relative
        `;
        break;

      case "ENFANT":

        query = `
        MATCH (me:Personne {id:$userId})

        CREATE (
          relative:Personne {
            id:$relativeId,
            nomComplet:$nomComplet,
            dateNaissance:$dateNaissance,
            paysOrigine:$paysOrigine,
            ethnie:$ethnie
          }
        )

        CREATE
        (me)-[:PARENT_DE]->(relative)

        RETURN relative
        `;
        break;

      default:

        query = `
        MATCH (me:Personne {id:$userId})

        CREATE (
          relative:Personne {
            id:$relativeId,
            nomComplet:$nomComplet,
            dateNaissance:$dateNaissance,
            paysOrigine:$paysOrigine,
            ethnie:$ethnie
          }
        )

        CREATE
        (me)-[:LIE_A]->(relative)

        RETURN relative
        `;
    }

    const result =
      await session.run(
        query,
        {
          userId,
          relativeId,
          nomComplet,
          dateNaissance,
          paysOrigine,
          ethnie
        }
      );

    res.json({
      success: true,
      relative:
        result.records[0]
          ?.get("relative")
          ?.properties
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message:
        "Erreur lors de l'ajout du proche"
    });

  } finally {

    await session.close();

  }

};
``