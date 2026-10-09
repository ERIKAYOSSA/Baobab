import { Request, Response } from "express";
import { driver } from "../database/database";

export const register = async (
  req: Request,
  res: Response
) => {
  const session = driver.session();

  try {
    const {
      telephone,
      motDePasse,
      nomComplet,
      dateNaissance,
      genre,
      nationalite,
      langue,
      ethnie,
      region,
    } = req.body;

    const result = await session.run(
      `
      CREATE (p:Personne {
        id: randomUUID(),
        telephone: $telephone,
        motDePasse: $motDePasse,
        nomComplet: $nomComplet,
        dateNaissance: $dateNaissance,
        genre: $genre,
        nationalite: $nationalite,
        langue: $langue,
        ethnie: $ethnie,
        region: $region
      })
      RETURN p
      `,
      {
        telephone,
        motDePasse,
        nomComplet,
        dateNaissance,
        genre,
        nationalite,
        langue,
        ethnie,
        region,
      }
    );

    const person =
      result.records[0]?.get("p")?.properties;

    return res.status(201).json({
      success: true,
      person,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de l'inscription",
    });

  } finally {
    await session.close();
  }
};

export const login = async (
  req: Request,
  res: Response
) => {
  const session = driver.session();

  try {
    const {
      telephone,
      motDePasse,
    } = req.body;

    const result = await session.run(
      `
      MATCH (p:Personne)
      WHERE p.telephone = $telephone
      AND p.motDePasse = $motDePasse
      RETURN p
      `,
      {
        telephone,
        motDePasse,
      }
    );

    const record =
      result.records[0];

    if (!record) {
      return res.status(401).json({
        success: false,
        message:
          "Téléphone ou mot de passe incorrect",
      });
    }

    const utilisateur =
      record.get("p").properties;

    return res.status(200).json({
      success: true,
      utilisateur,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la connexion",
    });

  } finally {
    await session.close();
  }
};

export const getUsers = async (
  req: Request,
  res: Response
) => {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (p:Personne)
      RETURN p
      `
    );

    const users = result.records.map(
      (record) =>
        record.get("p").properties
    );

    return res.status(200).json(users);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message:
        "Erreur lors de la récupération des utilisateurs",
    });

  } finally {
    await session.close();
  }
};