import neo4j, { Driver } from "neo4j-driver";
import { env } from "../config/env";

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      env.NEO4J_URI,
      neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD),
      {
        connectionTimeout: 20000,
        connectionAcquisitionTimeout: 20000,
      }
    );
  }
  return driver;
}

export async function verifyConnection(): Promise<void> {
  await getDriver().verifyConnectivity();
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
