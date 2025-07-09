import express from "express";
import { auth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import BotSubscription from "../models/BotSubscription";
import Bot from "../models/Bot";

const router = express.Router();

// All subscription routes require authentication
router.use(auth);

/**
 * @route POST /api/subscriptions
 * @desc Subscribe to a bot
 * @access Private
 */
router.post("/", async (req, res, next) => {
  try {
    const { botId } = req.body;

    // Validate required field
    if (!botId) {
      throw new AppError("Bot ID is required", 400, "missing-bot-id");
    }

    // Check if bot exists
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Check if user is already subscribed to this bot
    const existingSubscription = await BotSubscription.findOne({
      userId: req.user._id,
      botId: botId,
    });

    if (existingSubscription) {
      if (existingSubscription.status === "active") {
        throw new AppError(
          "You are already subscribed to this bot",
          409,
          "already-subscribed"
        );
      } else if (existingSubscription.status === "cancelled") {
        // Reactivate cancelled subscription
        const updatedSubscription = await BotSubscription.findByIdAndUpdate(
          existingSubscription._id,
          {
            status: "active",
            $unset: { cancelledAt: 1 },
          },
          { new: true }
        );

        const transformedSubscription: any = {
          ...updatedSubscription!.toObject(),
          id: updatedSubscription!._id,
        };
        delete transformedSubscription._id;
        delete transformedSubscription.__v;

        res.status(200).json({
          status: "success",
          message: "Subscription reactivated successfully",
          data: transformedSubscription,
        });
        return;
      }
    }

    // Create new subscription
    const subscription = await BotSubscription.create({
      userId: req.user._id,
      botId: botId,
    });

    // Transform response
    const transformedSubscription: any = {
      ...subscription.toObject(),
      id: subscription._id,
    };
    delete transformedSubscription._id;
    delete transformedSubscription.__v;

    res.status(201).json({
      status: "success",
      message: "Successfully subscribed to bot",
      data: transformedSubscription,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/subscriptions
 * @desc Get user's subscriptions
 * @access Private
 */
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;

    // Build query
    const query: any = { userId: req.user._id };
    if (status && ["active", "cancelled"].includes(status as string)) {
      query.status = status;
    }

    const subscriptions = await BotSubscription.find(query)
      .populate(
        "botId",
        "name description recommendedCapital performanceDuration script"
      )
      .select("-__v")
      .sort({ subscribedAt: -1 });

    // Transform response
    const transformedSubscriptions = subscriptions.map((subscription) => {
      const subscriptionObj = subscription.toObject();
      const transformedSubscription: any = {
        ...subscriptionObj,
        id: subscriptionObj._id,
        bot: (subscriptionObj.botId as any)?._id
          ? {
              id: (subscriptionObj.botId as any)._id,
              name: (subscriptionObj.botId as any).name,
              description: (subscriptionObj.botId as any).description,
              recommendedCapital: (subscriptionObj.botId as any)
                .recommendedCapital,
              performanceDuration: (subscriptionObj.botId as any)
                .performanceDuration,
              script: (subscriptionObj.botId as any).script,
            }
          : null,
      };
      delete transformedSubscription._id;
      delete transformedSubscription.botId;
      return transformedSubscription;
    });

    res.status(200).json({
      status: "success",
      data: transformedSubscriptions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/subscriptions/:id
 * @desc Get specific subscription
 * @access Private
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const subscription = await BotSubscription.findOne({
      _id: id,
      userId: req.user._id,
    })
      .populate(
        "botId",
        "name description recommendedCapital performanceDuration script"
      )
      .select("-__v");

    if (!subscription) {
      throw new AppError(
        "Subscription not found",
        404,
        "subscription-not-found"
      );
    }

    // Transform response
    const subscriptionObj = subscription.toObject();
    const transformedSubscription: any = {
      ...subscriptionObj,
      id: subscriptionObj._id,
      bot: (subscriptionObj.botId as any)?._id
        ? {
            id: (subscriptionObj.botId as any)._id,
            name: (subscriptionObj.botId as any).name,
            description: (subscriptionObj.botId as any).description,
            recommendedCapital: (subscriptionObj.botId as any)
              .recommendedCapital,
            performanceDuration: (subscriptionObj.botId as any)
              .performanceDuration,
            script: (subscriptionObj.botId as any).script,
          }
        : null,
    };
    delete transformedSubscription._id;
    delete transformedSubscription.botId;

    res.status(200).json({
      status: "success",
      data: transformedSubscription,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/subscriptions/:id/cancel
 * @desc Cancel a subscription
 * @access Private
 */
router.put("/:id/cancel", async (req, res, next) => {
  try {
    const { id } = req.params;

    const subscription = await BotSubscription.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!subscription) {
      throw new AppError(
        "Subscription not found",
        404,
        "subscription-not-found"
      );
    }

    if (subscription.status === "cancelled") {
      throw new AppError(
        "Subscription is already cancelled",
        400,
        "already-cancelled"
      );
    }

    // Cancel subscription
    const updatedSubscription = await BotSubscription.findByIdAndUpdate(
      id,
      {
        status: "cancelled",
        cancelledAt: new Date(),
      },
      { new: true }
    );

    // Transform response
    const transformedSubscription: any = {
      ...updatedSubscription!.toObject(),
      id: updatedSubscription!._id,
    };
    delete transformedSubscription._id;
    delete transformedSubscription.__v;

    res.status(200).json({
      status: "success",
      message: "Subscription cancelled successfully",
      data: transformedSubscription,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/subscriptions/check/:botId
 * @desc Check if user is subscribed to a specific bot
 * @access Private
 */
router.get("/check/:botId", async (req, res, next) => {
  try {
    const { botId } = req.params;

    // Check if bot exists
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Check if user is subscribed to this bot
    const subscription = await BotSubscription.findOne({
      userId: req.user._id,
      botId: botId,
    });

    const isSubscribed = Boolean(
      subscription && subscription.status === "active"
    );

    res.status(200).json({
      status: "success",
      data: {
        botId: botId,
        isSubscribed: isSubscribed,
        subscription: subscription
          ? {
              id: subscription._id,
              status: subscription.status,
              subscribedAt: subscription.subscribedAt,
              cancelledAt: subscription.cancelledAt,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/subscriptions/:id
 * @desc Delete a subscription (permanent removal)
 * @access Private
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const subscription = await BotSubscription.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!subscription) {
      throw new AppError(
        "Subscription not found",
        404,
        "subscription-not-found"
      );
    }

    res.status(200).json({
      status: "success",
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
