import createError from "../utils/createError.js";
import Gig from "../models/gig.model.js";
import Order from "../models/order.model.js";
import Review from "../models/review.model.js";

const createReview = async (req, res, next) => {
  try {
    const star = Number(req.body.star);
    if (!Number.isInteger(star) || star < 1 || star > 5)
      return next(createError(400, "Star must be a whole number from 1 to 5!"));

    const gig = await Gig.findById(req.body.gigId);
    if (!gig) return next(createError(404, "Gig not found!"));

    // The only guard here was commented out, and it checked the global isSeller
    // flag rather than ownership - so a seller could rate their own gig five
    // stars, and repeat it from a second account's gig too.
    if (gig.userId === req.userId)
      return next(createError(403, "You can't review your own gig!"));

    // Ratings only mean something if the reviewer actually bought the service.
    const purchased = await Order.exists({
      gigId: gig._id.toString(),
      buyerId: req.userId,
      isCompleted: true,
    });
    if (!purchased)
      return next(
        createError(403, "Only buyers who completed an order can review a gig!")
      );

    const review = await Review.findOne({
      gigId: req.body.gigId,
      userId: req.userId,
    });
    if (review)
      return next(
        createError(403, "You have already created a review for this gig!")
      );

    // Create first: bumping the counters up front left the gig's rating
    // inflated whenever the review itself failed to save.
    const newReview = await Review.create({
      userId: req.userId,
      gigId: req.body.gigId,
      desc: req.body.desc,
      star,
    });
    await Gig.findByIdAndUpdate(req.body.gigId, {
      $inc: { totalStars: star, starNumber: 1 },
    });
    res.status(201).send(newReview);
  } catch (err) {
    next(err);
  }
};

const getReviews = async (req, res, next) => {
  try {
    const review = await Review.find({ gigId: req.params.gigId });
    res.status(200).send(review);
  } catch (err) {
    next(err);
  }
};
const deleteReview = async (req, res, next) => {
  try {
    // The route is /:id - req.params.gigId was always undefined, and
    // findByIdAndDelete takes an id rather than a filter.
    const review = await Review.findById(req.params.id);
    if (!review) return next(createError(404, "Review not found!"));
    if (review.userId !== req.userId)
      return next(createError(403, "You can delete only your own reviews!"));

    await Review.findByIdAndDelete(req.params.id);
    // Roll the gig's rating back, otherwise deleting skews the average.
    await Gig.findByIdAndUpdate(review.gigId, {
      $inc: { totalStars: -review.star, starNumber: -1 },
    });
    res.status(200).send("Deleted successfully!");
  } catch (err) {
    next(err);
  }
};

export { createReview, getReviews, deleteReview };
