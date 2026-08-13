import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

const isProduction = process.env.NODE_ENV === "production";

// The client and the API live on different domains once deployed, so the cookie
// has to be SameSite=None + Secure or the browser drops it silently.
const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
};

const register = async (req, res, next) => {
  try {
    const { username, email, password, img, country, phone, desc, isSeller } =
      req.body;
    if (!username || !email || !password || !country)
      return next(
        createError(400, "Username, email, password and country are required!")
      );

    const hashedPassword = bcrypt.hashSync(password, 10);
    // Whitelisted fields instead of spreading the whole body.
    await User.create({
      username,
      email,
      img,
      country,
      phone,
      desc,
      isSeller: !!isSeller,
      password: hashedPassword,
    });
    res.status(201).send("User has been created!");
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "account";
      return next(createError(409, `That ${field} is already taken!`));
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    // Same status and message for both branches so the endpoint can't be used
    // to enumerate which usernames exist.
    if (!user) return next(createError(401, "Wrong password or username!"));
    const isCorrectPassword = bcrypt.compareSync(
      req.body.password,
      user.password
    );
    if (!isCorrectPassword)
      return next(createError(401, "Wrong password or username!"));
    const token = jwt.sign(
      {
        id: user._id,
        isSeller: user.isSeller,
      },
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

const logout = async (req, res) => {
  // clearCookie only matches when the options mirror the ones used to set it.
  res
    .clearCookie("accessToken", cookieOptions)
    .status(200)
    .send("User has been logged out.");
};

export { login, logout, register };
