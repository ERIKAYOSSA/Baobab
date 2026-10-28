import { env } from "./config/env";
import { app } from "./app";
import { closeDriver } from "./db/neo4j";

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Baobab API running on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Closing server...`);
  server.close(async () => {
    await closeDriver();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
