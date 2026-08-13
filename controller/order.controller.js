import createError from "../utils/createError.js";
import Order from "../models/order.model.js";
import Gig from "../models/gig.model.js";
import Stripe from "stripe";

// A PaymentIntent can still be paid as long as Stripe has not cancelled or
// completed it, so an existing pending order should reuse its intent rather
// than be handed a fresh one.
const REUSABLE_INTENT_STATUSES = [
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
];

const intent = async (req, res, next) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const gig = await Gig.findById(req.params.id);
    if (!gig) return next(createError(404, "Gig not found!"));

    // Selling and buying on one account is fine - that is what the mode switch
    // is for - but buying your own gig would let a seller inflate their own
    // sales count and then review themselves through the purchase check.
    if (gig.userId === req.userId)
      return next(createError(403, "You can't buy your own gig!"));

    // Purchasing is a buyer-mode action. Enforced here as well as in the UI so
    // the rule holds for anyone calling the API directly.
    if (req.isSeller)
      return next(
        createError(403, "Switch to buying mode before placing an order.")
      );

    const amount = Math.round(gig.price * 100);

    // One pending order per (gig, buyer) so abandoned checkouts do not pile up.
    const pending = await Order.findOne({
      gigId: gig._id,
      buyerId: req.userId,
      isCompleted: false,
    });

    // Reuse the existing intent when Stripe still considers it payable.
    // Overwriting payment_intent on every visit orphaned the previous one: a
    // buyer who paid from an older tab came back with an id no order carried
    // any more, and confirmation failed with "Order not found!".
    if (pending?.payment_intent) {
      try {
        const existing = await stripe.paymentIntents.retrieve(
          pending.payment_intent
        );
        if (
          REUSABLE_INTENT_STATUSES.includes(existing.status) &&
          existing.amount === amount
        ) {
          return res.status(200).send({ clientSecret: existing.client_secret });
        }
      } catch {
        // Unknown/deleted intent - fall through and create a new one.
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        gigId: String(gig._id),
        buyerId: String(req.userId),
      },
    });

    if (pending) {
      await Order.updateOne(
        { _id: pending._id },
        {
          $set: {
            img: gig.cover,
            title: gig.title,
            sellerId: gig.userId,
            price: gig.price,
            payment_intent: paymentIntent.id,
          },
        }
      );
    } else {
      await Order.create({
        gigId: gig._id,
        img: gig.cover,
        title: gig.title,
        buyerId: req.userId,
        sellerId: gig.userId,
        price: gig.price,
        payment_intent: paymentIntent.id,
      });
    }

    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    next(err);
  }
};

const getOrders = async (req, res, next) => {
  try {
    // Every order the user is party to, on either side. Filtering by the
    // global isSeller flag meant a seller browsing in buying mode saw none of
    // their sales, and vice versa - the same defect that hid conversations.
    const orders = await Order.find({
      $or: [{ sellerId: req.userId }, { buyerId: req.userId }],
      isCompleted: true,
    }).sort({ createdAt: -1 });
    res.status(200).send(orders);
  } catch (err) {
    next(err);
  }
};

const confirm = async (req, res, next) => {
  try {
    const paymentIntentId = req.body.payment_intent;
    if (!paymentIntentId)
      return next(createError(400, "payment_intent is required!"));

    // Already done - reloading /success must not count the sale twice.
    const already = await Order.findOne({
      payment_intent: paymentIntentId,
      buyerId: req.userId,
      isCompleted: true,
    });
    if (already) return res.status(200).send("Order has been confirmed.");

    // Stripe is the only authority on whether money moved. The old code marked
    // an order complete purely because the client posted its payment_intent,
    // so any buyer could mark their own pending order as paid without paying.
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let paymentIntent = null;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      return next(createError(404, "Order not found!"));
    }

    if (paymentIntent.status !== "succeeded")
      return next(
        createError(402, "Payment has not completed yet. Please try again.")
      );

    // Never trust an intent that names a different buyer.
    const metaBuyer = paymentIntent.metadata?.buyerId;
    if (metaBuyer && metaBuyer !== req.userId)
      return next(createError(403, "This payment belongs to another account!"));

    let order = await Order.findOneAndUpdate(
      { payment_intent: paymentIntentId, buyerId: req.userId, isCompleted: false },
      { $set: { isCompleted: true } },
      { new: true }
    );

    if (!order) {
      // Recovery. Orders written before intents were reused can hold a
      // superseded id, so a genuinely paid checkout arrives with an intent no
      // order carries any more. The payment is already verified above.
      const filter = { buyerId: req.userId, isCompleted: false };
      if (paymentIntent.metadata?.gigId) {
        filter.gigId = paymentIntent.metadata.gigId;
      } else {
        // Pre-metadata intents: match on the amount that was charged.
        filter.price = paymentIntent.amount / 100;
      }
      order = await Order.findOneAndUpdate(
        filter,
        { $set: { isCompleted: true, payment_intent: paymentIntentId } },
        { new: true, sort: { createdAt: -1 } }
      );
    }

    if (!order) return next(createError(404, "Order not found!"));

    // The gig's `sales` counter is shown on My Gigs and drives the "Best
    // Selling" sort, but nothing ever incremented it.
    await Gig.findByIdAndUpdate(order.gigId, { $inc: { sales: 1 } });
    return res.status(200).send("Order has been confirmed.");
  } catch (err) {
    next(err);
  }
};

export { intent, confirm, getOrders };
