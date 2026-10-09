import { Request, Response } from "express";
import { driver } from "../database/database";
import crypto from "crypto";

export const sendRelationshipRequest =
async (
  req: Request,
  res: Response
) => {

  const {
    senderId,
    receiverId
  } = req.body;

  const session =
    driver.session();

  try {

    const requestId =
      crypto.randomUUID();

    await session.run(

      `
      MATCH
      (sender:Personne {id:$senderId})

      MATCH
      (receiver:Personne {id:$receiverId})

      CREATE

      (request:Notification {
        id:$requestId,
        type:"FAMILY_REQUEST",
        status:"PENDING",
        createdAt:datetime()
      })

      CREATE
      (sender)-[:SENT_REQUEST]->(request)

      CREATE
      (request)-[:FOR]->(receiver)
      `,

      {
        senderId,
        receiverId,
        requestId
      }

    );

    res.json({

      success: true,

      message:
        "Demande envoyée ✅"

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message:
        "Erreur envoi demande"

    });

  } finally {

    await session.close();

  }

};