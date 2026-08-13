import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
};

const PUBLIC_FIELDS = "username img country desc isSeller createdAt";

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(createError(404, "User not found!"));
    if (req.userId !== user._id.toString())
      return next(createError(403, "You can delete only your account!"));
    await User.findByIdAndDelete(req.params.id);
    res.status(200).send("Deleted Successfully!");
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    // Public endpoint (gig cards and reviews render seller info for logged-out
    // visitors), so only non-sensitive fields go out - no email, phone or hash.
    const user = await User.findById(req.params.id).select(PUBLIC_FIELDS);
    if (!user) return next(createError(404, "User not found!"));

    res.status(200).send(user);
  } catch (error) {
    next(error);
  }
};

// Fiverr lets one account both sell and buy. isSeller lives inside the JWT and
// drives getOrders/getConversations, so flipping it has to re-issue the cookie
// or the API would keep acting on the stale role.
const switchMode = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return next(createError(404, "User not found!"));

    const isSeller =
      typeof req.body.isSeller === "boolean" ? req.body.isSeller : !user.isSeller;
    user.isSeller = isSeller;
    await user.save();

    const token = jwt.sign(
      { id: user._id, isSeller: user.isSeller },
      process.env.JWT_SEC,
      { expiresIn: "7d" }
    );

    const { password, ...others } = user._doc;
    res
      .cookie("accessToken", token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json(others);
  } catch (error) {
    next(error);
  }
};

export { deleteUser, getUser, switchMode };
