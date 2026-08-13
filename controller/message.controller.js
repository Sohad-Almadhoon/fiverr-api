import createError from "../utils/createError.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

// Conversations are looked up by their composite `id` field, not by _id.
const findConversationFor = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({ id: conversationId });
  if (!conversation) throw createError(404, "Conversation not found!");
  if (conversation.sellerId !== userId && conversation.buyerId !== userId)
    throw createError(403, "You are not part of this conversation!");
  return conversation;
};

const createMessage = async (req, res, next) => {
  try {
    const conversation = await findConversationFor(
      req.body.conversationId,
      req.userId
    );
    // Role taken from the conversation itself, not the global isSeller flag.
    const isSeller = conversation.sellerId === req.userId;

    const newMessage = await Message.create({
      conversationId: req.body.conversationId,
      userId: req.userId,
      desc: req.body.desc,
    });
    // findByIdAndUpdate expects an _id, not a filter object - the conversation
    // was never actually being updated.
    await Conversation.findOneAndUpdate(
      { id: req.body.conversationId },
      {
        $set: {
          readBySeller: isSeller,
          readByBuyer: !isSeller,
          lastMessage: req.body.desc,
        },
      },
      { new: true }
    );
    res.status(201).send(newMessage);
  } catch (err) {
    next(err);
  }
};
const getMessages = async (req, res, next) => {
  try {
    // Authorized: any logged-in user could read any thread by guessing its id.
    await findConversationFor(req.params.id, req.userId);
    const messages = await Message.find({ conversationId: req.params.id });
    res.status(200).send(messages);
  } catch (err) {
    next(err);
  }
};
export { createMessage, getMessages };
