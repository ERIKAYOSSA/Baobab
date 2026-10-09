import {
  Router
} from "express";

import {
  sendRelationshipRequest
} from "../controllers/relationController";

const router =
  Router();

router.post(
  "/request",
  sendRelationshipRequest
);

export default router;