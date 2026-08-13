import mongoose from "mongoose";
import { Schema } from "mongoose";
import { CATEGORIES } from "../utils/categories.js";

const gigSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    desc: {
      type: String,
      required: true,
    },
    totalStars: {
      type: Number,
      default: 0,
    },
    starNumber: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    cat: {
      type: String,
      required: true,
      // Enum so a typo can't create a category nothing links to.
      enum: CATEGORIES,
    },
    cover: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
    },
    shortTitle: {
      type: String,
      required: true,
    },
    shortDesc: {
      type: String,
      required: true,
    },
    deliveryTime: {
      type: Number,
      required: true,
    },
    revisionNumber: {
      type: Number,
      required: true,
    },
    features: {
      type: [String],
    },
    sales: {
      type: Number,
      default: 0,
    },
    // Impressions on the gig detail page, so a seller can see reach vs sales.
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// The list and "my gigs" pages always filter on these.
gigSchema.index({ cat: 1 });
gigSchema.index({ userId: 1 });

const Gig = mongoose.model("Gig", gigSchema);
export default Gig;
