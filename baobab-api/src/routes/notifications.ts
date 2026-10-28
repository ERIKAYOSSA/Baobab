import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { getDriver } from "../db/neo4j";
import { getNotifications } from "../services/notifications";

const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const personId = req.auth!.personId;
  const session = getDriver().session();

  try {
    const data = await getNotifications(session, personId);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch notifications",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

export { notificationsRouter };
