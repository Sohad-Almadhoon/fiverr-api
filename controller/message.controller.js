import createError from "../utils/createError.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

const createMessage = async (req, res, next) => {
  try {
    const newMessage = await Message.create({
      conversationId: req.body.conversationId,
      userId: req.userId,
      desc: req.body.desc,
    });
    await Conversation.findByIdAndUpdate(
      { id: req.body.conversationId },
      {
        $set: {
          readBySeller: req.isSeller,
          readByBuyer: !req.isSeller,
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
    const messages = await Message.find({ conversationId: req.params.id });
    res.status(200).send(messages);
  } catch (err) {
    next(err);
  }
};
export { createMessage, getMessages };
