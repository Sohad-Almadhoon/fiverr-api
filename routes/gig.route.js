import express from "express";
import { verifyToken, attachUser } from "../middleware/jwt.js";
import {
  createGig,
  deleteGig,
  getGig,
  getGigs,
  getCategoryCounts,
} from "../controller/gig.controller.js";
const router = express.Router();

router.post("/", verifyToken, createGig);
router.delete("/:id", verifyToken, deleteGig);
// Static path first, otherwise "/categories" would be swallowed by "/single/:id"
// style params further down.
router.get("/categories", getCategoryCounts);
// attachUser (not verifyToken): public page, but knowing the caller lets us skip
// counting the owner's own views.
router.get("/single/:id", attachUser, getGig);
router.get("/", getGigs);
export default router;
