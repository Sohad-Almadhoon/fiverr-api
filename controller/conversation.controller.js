import createError from "../utils/createError.js";
import Conversation from "../models/conversation.model.js";

const isParticipant = (conversation, userId) =>
  conversation.sellerId === userId || conversation.buyerId === userId;

const createConversation = async (req, res, next) => {
  try {
    if (!req.body.to) return next(createError(400, "'to' is required!"));
    if (req.body.to === req.userId)
      return next(createError(400, "You can't message yourself!"));

    // Role comes from the caller's intent, not from their global isSeller
    // flag. Contacting a gig owner makes you the buyer even if you also sell;
    // the old code recorded a seller-mode user as the *seller* of a thread they
    // started, inverting both ids.
    const amSeller =
      typeof req.body.asSeller === "boolean" ? req.body.asSeller : !!req.isSeller;

    const sellerId = amSeller ? req.userId : req.body.to;
    const buyerId = amSeller ? req.body.to : req.userId;
    const id = sellerId + buyerId;

    const newConversation = await Conversation.create({
      id,
      sellerId,
      buyerId,
      readBySeller: amSeller,
      readByBuyer: !amSeller,
    });
    res.status(201).send(newConversation);
  } catch (err) {
    // The `id` index is unique - hand back the existing thread instead of a 500
    // when two "contact" clicks race.
    if (err.code === 11000) {
      const amSeller =
        typeof req.body.asSeller === "boolean"
          ? req.body.asSeller
          : !!req.isSeller;
      const id = amSeller
        ? req.userId + req.body.to
        : req.body.to + req.userId;
      const existing = await Conversation.findOne({ id });
      if (existing) return res.status(200).send(existing);
    }
    next(err);
  }
};

const updateConversation = async (req, res, next) => {
  try {
    // Authorized: any logged-in user could mark someone else's thread as read.
    const conversation = await Conversation.findOne({ id: req.params.id });
    if (!conversation) return next(createError(404, "Not found!"));
    if (!isParticipant(conversation, req.userId))
      return next(createError(403, "You are not part of this conversation!"));

    const isSeller = conversation.sellerId === req.userId;
    const updatedConversation = await Conversation.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          ...(isSeller ? { readBySeller: true } : { readByBuyer: true }),
        },
      },
      { new: true }
    );

    res.status(200).send(updatedConversation);
  } catch (err) {
    next(err);
  }
};
const getSingleConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ id: req.params.id });
    if (!conversation) return next(createError(404, "Not found!"));
    if (!isParticipant(conversation, req.userId))
      return next(createError(403, "You are not part of this conversation!"));
    res.status(200).send(conversation);
  } catch (err) {
    next(err);
  }
};

const getConversations = async (req, res, next) => {
  try {
    // Every thread the user belongs to, whichever side they are on. Filtering
    // by the global isSeller flag hid a buyer's message from the seller
    // whenever that seller happened to be in buying mode - and hid a user's
    // own threads from them the moment they switched modes.
    const conversations = await Conversation.find({
      $or: [{ sellerId: req.userId }, { buyerId: req.userId }],
    }).sort({ updatedAt: -1 });
    res.status(200).send(conversations);
  } catch (err) {
    next(err);
  }
};

export {
  createConversation,
  getConversations,
  updateConversation,
  getSingleConversation,
};
