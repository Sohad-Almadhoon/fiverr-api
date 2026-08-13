import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs/promises";
import userRoute from "./routes/user.route.js";
import gigRoute from "./routes/gig.route.js";
import orderRoute from "./routes/order.route.js";
import conversationRoute from "./routes/conversation.route.js";
import messageRoute from "./routes/message.route.js";
import reviewRoute from "./routes/review.route.js";
import authRoute from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import createError from "./utils/createError.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

// Explicit allowlist: with credentials:true and no origin, cors() reflects
// whatever Origin the caller sends, so any site could make authenticated calls.
// Comma-separated so the same build works locally and once deployed.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));

const connectToDB = async () => {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Connected to MongoDB!");
};

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/gigs", gigRoute);
app.use("/api/orders", orderRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);
app.use("/api/reviews", reviewRoute);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Middleware to handle file uploads. Stays unauthenticated because registration
// uploads the avatar before the account exists.
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      return cb(
        createError(400, "Only JPEG, PNG, GIF or WebP images are allowed!")
      );
    }
    cb(null, true);
  },
});

app.post("/api/upload", upload.single("file"), async (req, res, next) => {
  if (!req.file) return next(createError(400, "No file was uploaded!"));
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      upload_preset: "fiverr",
    });
    res.json({ url: result.secure_url });
  } catch (error) {
    next(createError(500, "Upload failed!"));
  } finally {
    // The temp file is useless once Cloudinary has it (or the upload failed).
    await fs.unlink(req.file.path).catch(() => {});
  }
});

app.use((req, res, next) => {
  next(createError(404, `Route ${req.method} ${req.originalUrl} not found!`));
});

app.use((err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || "Something went wrong!";

  return res.status(errorStatus).json({ error: errorMessage });
});

const PORT = process.env.PORT || 5000;

// Connect first: the server used to start accepting requests before Mongo was
// reachable, and a failed connection was only logged.
connectToDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}!`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  });
