import Gig from "../models/gig.model.js";
import Order from "../models/order.model.js";
import Review from "../models/review.model.js";
import createError from "../utils/createError.js";
import { CATEGORIES, isValidCategory } from "../utils/categories.js";

const SORTABLE_FIELDS = ["sales", "createdAt", "price", "totalStars", "views"];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createGig = async (req, res, next) => {
  if (!req.isSeller)
    return next(createError(403, "Only seller can create a gig!"));
  try {
    if (!isValidCategory(req.body.cat))
      return next(
        createError(400, `Category must be one of: ${CATEGORIES.join(", ")}`)
      );
    // userId last: a client-supplied userId must never win over the token.
    const savedGig = await Gig.create({ ...req.body, userId: req.userId });
    res.status(201).json(savedGig);
  } catch (error) {
    next(error);
  }
};

const deleteGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return next(createError(404, "Gig not found!"));
    if (gig.userId !== req.userId)
      return next(createError(403, "You can delete only your gigs"));
    await Gig.findByIdAndDelete(req.params.id);
    // Paid orders are financial records - only the unpaid ones go away, and
    // deleteMany because a gig can have more than one.
    await Order.deleteMany({ gigId: gig._id, isCompleted: false });
    await Review.deleteMany({ gigId: gig._id });
    res.status(200).send("Gig has been deleted!");
  } catch (error) {
    next(error);
  }
};

const getGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return next(createError(404, "Gig not found!"));

    // attachUser populates req.userId when a cookie is present. A seller
    // refreshing their own page should not inflate their view count.
    if (!req.userId || req.userId !== gig.userId) {
      await Gig.updateOne({ _id: gig._id }, { $inc: { views: 1 } });
    }

    res.status(200).send(gig);
  } catch (error) {
    next(error);
  }
};

const getGigs = async (req, res, next) => {
  const q = req.query;
  const min = Number(q.min);
  const max = Number(q.max);
  const hasMin = q.min !== undefined && q.min !== "" && !Number.isNaN(min);
  const hasMax = q.max !== undefined && q.max !== "" && !Number.isNaN(max);

  const filters = {
    ...(q.userId && { userId: q.userId }),
    ...(q.cat && { cat: q.cat }),
    ...((hasMin || hasMax) && {
      price: {
        // Inclusive: $gt/$lt excluded the boundary prices the user typed.
        ...(hasMin && { $gte: min }),
        ...(hasMax && { $lte: max }),
      },
    }),
    // Escaped so a search like "(a+)+$" can't hang the regex engine.
    ...(q.search && {
      title: { $regex: escapeRegex(q.search), $options: "i" },
    }),
  };
  const sortField = SORTABLE_FIELDS.includes(q.sort) ? q.sort : "createdAt";
  const limit = Math.min(Number(q.limit) || 100, 100);

  try {
    const gigs = await Gig.find(filters)
      .sort({ [sortField]: -1 })
      .limit(limit);
    res.status(200).send(gigs);
  } catch (error) {
    next(error);
  }
};

// Powers the home page category grid: real counts instead of a hardcoded list.
const getCategoryCounts = async (req, res, next) => {
  try {
    const rows = await Gig.aggregate([
      { $group: { _id: "$cat", count: { $sum: 1 } } },
    ]);
    const counts = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    res
      .status(200)
      .send(CATEGORIES.map((cat) => ({ cat, count: counts[cat] || 0 })));
  } catch (error) {
    next(error);
  }
};

export { createGig, deleteGig, getGig, getGigs, getCategoryCounts };
