import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();
console.log(
  "URI:",
  process.env.NEO4J_URI
);

console.log(
  "USERNAME:",
  process.env.NEO4J_USERNAME
);

export const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME!,
    process.env.NEO4J_PASSWORD!
  )
);