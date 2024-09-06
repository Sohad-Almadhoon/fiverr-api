import mongoose from "mongoose";
import { Schema } from "mongoose";

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
  },
  { timestamps: true }
);
const Gig = mongoose.model("Gig", gigSchema);
export default Gig;
