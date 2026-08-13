import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) return next(createError(401, "You are not authenticated!"));
  jwt.verify(token, process.env.JWT_SEC, async (err, payload) => {
    if (err) return next(createError(403, "Token is not valid!"));
    req.userId = payload.id;
    req.isSeller = payload.isSeller;
    next();
  });
};

// Same as verifyToken but never rejects. Public endpoints use it when knowing
// *who* is calling changes the response - e.g. not counting a seller's own
// visits as views on their gig.
export const attachUser = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SEC, (err, payload) => {
    if (!err && payload) {
      req.userId = payload.id;
      req.isSeller = payload.isSeller;
    }
    next();
  });
};
