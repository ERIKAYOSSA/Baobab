import { Router } from "express";
import { verifyConnection } from "../db/neo4j";

const dbCheckRouter = Router();

dbCheckRouter.get("/", async (_req, res) => {
  try {
    await verifyConnection();
    res.json({ ok: true, database: "neo4j", message: "Connection successful" });
  } catch (error) {
    res.status(500).json({
      ok: false,
      database: "neo4j",
      message: "Connection failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export { dbCheckRouter };
