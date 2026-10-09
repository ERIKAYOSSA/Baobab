import { Request, Response }
from "express";

import { driver }
from "../database/database";

export const searchFamily =
async (
  req: Request,
  res: Response
) => {

  const {

    nom,

    pays,

    ethnie

  } = req.body;

  const session =
    driver.session();

  try {

    const result =
      await session.run(

        `
        MATCH
        (candidate:Personne)

        WHERE

        ($nom = ""

        OR

        toLower(
          candidate.nomComplet
        )

        CONTAINS

        toLower($nom))

        AND

        ($pays = ""

        OR

        toLower(
          candidate.nationalite
        )

        CONTAINS

        toLower($pays))

        AND

        ($ethnie = ""

        OR

        toLower(
          candidate.ethnie
        )

        CONTAINS

        toLower($ethnie))

        RETURN candidate

        LIMIT 20
        `,

        {
          nom:
            nom || "",

          pays:
            pays || "",

          ethnie:
            ethnie || ""
        }

      );

    const persons =
      result.records.map(
        (
          record
        ) => {

          const candidate =
            record
              .get(
                "candidate"
              )
              .properties;

          return {

            id:
              candidate.id,

            nomComplet:
              candidate.nomComplet,

            ville:
              candidate.region,

            relationProbable:
              "Correspondance potentielle"

          };

        }
      );

    res.json(
      persons
    );

  } catch (
    error
  ) {

    console.error(
      error
    );

    res.status(
      500
    ).json({

      message:
        "Erreur recherche famille"

    });

  } finally {

    await session.close();

  }

};