import {
  Router
}
from "express";

import {
  searchFamily
}
from "../controllers/discoverController";

const router =
  Router();

router.post(
  "/search",
  searchFamily
);

export default router;