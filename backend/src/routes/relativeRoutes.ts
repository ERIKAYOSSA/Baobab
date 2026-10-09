import { Router }
from "express";

import {
  addRelative
}
from "../controllers/relativeController";

const router =
  Router();

router.post(
  "/add",
  addRelative
);

export default router;