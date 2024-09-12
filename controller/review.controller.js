import createError from "../utils/createError.js";
import Gig from "../models/gig.model.js";
import Review from "../models/review.model.js";

const createReview = async (req, res, next) => {
  // if (req.isSeller)
  //   return next(createError(403, "Sellers can't create a review!"));
  try {
    const review = await Review.findOne({
      gigId: req.body.gigId,
      userId: req.userId,
    });
    if (review)
      return next(
        createError(403, "You have already created a review for this gig!")
      );
    await Gig.findByIdAndUpdate(req.body.gigId, {
      $inc: { totalStars: req.body.star, starNumber: 1 },
    });
    const newReview = await Review.create({
      userId: req.userId,
      gigId: req.body.gigId,
      desc: req.body.desc,
      star: req.body.star,
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
    await Review.findByIdAndDelete({ gigId: req.params.gigId });
    res.status(200).send("Deleted successfully!");
  } catch (err) {
    next(err);
  }
};

export { createReview, getReviews, deleteReview };
