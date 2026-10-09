import express from "express";
import cors from "cors";
import { driver } from "./database/database";
import authRoutes from "./routes/auth.routes";
import discoverRoutes
from "./routes/discoverRoutes";
import relativeRoutes
from "./routes/relativeRoutes";
import treeRoutes
from "./routes/treeRoutes";
import relationRoutes
from "./routes/relationRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use(
  "/api/discover",
  discoverRoutes
);
app.use(
  "/api/relatives",
  relativeRoutes
);
app.use(
  "/api/discover",
  discoverRoutes
);
app.use(
  "/api/tree",
  treeRoutes
);
app.use(
  "/api/relations",
  relationRoutes
);

app.get("/test-user", async (_req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      CREATE (p:Personne {
        id: randomUUID(),
        nomComplet: "Eric Ayossa"
      })
      RETURN p
      `
    );

    res.json({
      success: true,
      person: result.records[0]?.get("p").properties,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error,
    });

  } finally {
    await session.close();
  }
});
app.listen(5000, () => {
  console.log(
    "✅ Backend lancé sur le port 5000"
  );

  console.log(
    " Baobab API disponible sur http://localhost:5000"
  );
});