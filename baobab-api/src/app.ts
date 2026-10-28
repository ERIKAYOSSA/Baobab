import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { dbCheckRouter } from "./routes/dbCheck";
import { personsRouter } from "./routes/persons";
import { relationshipsRouter } from "./routes/relationships";
import { relationshipRequestsRouter } from "./routes/relationshipRequests";
import { authRouter } from "./routes/auth";
import { notificationsRouter } from "./routes/notifications";
import { adminRouter } from "./routes/admin";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "Welcome to Baobab API",
    docs: [
      "/health",
      "/db-check",
      "/persons",
      "/persons/search?q=",
      "/persons/:personId",
      "/persons/:personId/family-tree",
      "/persons/:personId/consanguinity",
      "/persons/:personId/pending-approvals",
      "/relationships",
      "/relationship-requests",
      "/relationship-requests/propose",
      "/auth/login",
      "/auth/send-otp",
      "/auth/verify-otp",
      "/auth/refresh",
      "/auth/logout",
      "/auth/me",
      "/auth/set-pin",
      "/auth/change-pin",
      "/notifications",
      "/persons/:personId/family-tree/export?format=svg",
      "/admin/diagnostics"
    ]
  });
});

app.use("/health", healthRouter);
app.use("/db-check", dbCheckRouter);
app.use("/persons", personsRouter);
app.use("/relationships", relationshipsRouter);
app.use("/relationship-requests", relationshipRequestsRouter);
app.use("/auth", authRouter);
app.use("/notifications", notificationsRouter);
app.use("/admin", adminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Unexpected error";
  res.status(500).json({ ok: false, message });
});

export { app };
