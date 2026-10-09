import { Router }
from "express";

import {
  getTree
}
from "../controllers/treeController";

const router =
  Router();

router.get(
  "/:userId",
  getTree
);

export default router;