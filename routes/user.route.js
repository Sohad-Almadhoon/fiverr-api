import express from "express";
import {
  deleteUser,
  getUser,
  switchMode,
} from "../controller/user.controller.js";
import { verifyToken } from "../middleware/jwt.js";
const router = express.Router();

router.delete("/delete/:id", verifyToken, deleteUser);
// Toggles between selling and buying and re-issues the auth cookie.
router.put("/mode", verifyToken, switchMode);
// Public: gig cards and reviews show seller info to logged-out visitors too.
// The controller only returns non-sensitive fields.
router.get("/:id", getUser);

export default router;
