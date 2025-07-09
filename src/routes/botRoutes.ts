import express from "express";
import { auth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import Bot from "../models/Bot";
import Group from "../models/Group";

const router = express.Router();

// All bot routes require authentication
router.use(auth);

/**
 * @route POST /api/bots
 * @desc Create a new bot
 * @access Private
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      description,
      recommendedCapital,
      performanceDuration,
      currency,
      script,
      groupId,
    } = req.body;

    // Validate required fields
    if (!name || !description || recommendedCapital === undefined || !groupId) {
      throw new AppError(
        "Please provide name, description, recommendedCapital, and groupId",
        400,
        "missing-required-fields"
      );
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new AppError("Group not found", 404, "group-not-found");
    }

    // Check if bot with same name already exists
    const existingBot = await Bot.findOne({ name });
    if (existingBot) {
      throw new AppError(
        "Bot with this name already exists",
        409,
        "duplicate-bot-name"
      );
    }

    // Create new bot
    const bot = await Bot.create({
      name,
      description,
      recommendedCapital,
      performanceDuration,
      currency,
      script,
      groupId,
    });

    // Transform response to remove __v and convert _id to id
    const transformedBot: any = {
      ...bot.toObject(),
      id: bot._id,
    };
    delete transformedBot._id;
    delete transformedBot.__v;

    res.status(201).json({
      status: "success",
      message: "Bot created successfully",
      data: transformedBot,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/bots
 * @desc Get all bots
 * @access Private
 */
router.get("/", async (req, res, next) => {
  try {
    const { groupId } = req.query;

    // Build query based on groupId parameter
    const query = groupId ? { groupId } : {};

    const bots = await Bot.find(query)
      .populate("groupId", "name")
      .select("-__v");

    // Transform response to convert _id to id
    const transformedBots = bots.map((bot) => {
      const botObj = bot.toObject();
      const transformedBot: any = {
        ...botObj,
        id: botObj._id,
        group: (botObj.groupId as any)?._id
          ? {
              id: (botObj.groupId as any)._id,
              name: (botObj.groupId as any).name,
            }
          : null,
      };
      delete transformedBot._id;
      delete transformedBot.groupId;
      return transformedBot;
    });

    res.status(200).json({
      status: "success",
      data: transformedBots,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/bots/:id
 * @desc Get a specific bot by ID
 * @access Private
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const bot = await Bot.findById(id)
      .populate("groupId", "name")
      .select("-__v");

    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Transform response to convert _id to id
    const botObj = bot.toObject();
    const transformedBot: any = {
      ...botObj,
      id: botObj._id,
      group: (botObj.groupId as any)?._id
        ? {
            id: (botObj.groupId as any)._id,
            name: (botObj.groupId as any).name,
          }
        : null,
    };
    delete transformedBot._id;
    delete transformedBot.groupId;

    res.status(200).json({
      status: "success",
      data: transformedBot,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/bots/:id/subscribers
 * @desc Get all users subscribed to a specific bot
 * @access Private
 */
router.get("/:id/subscribers", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if bot exists
    const bot = await Bot.findById(id);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    const BotSubscription = require("../models/BotSubscription").default;

    const subscriptions = await BotSubscription.find({
      botId: id,
      status: "active",
    })
      .populate("userId", "fullName email")
      .select("-__v")
      .sort({ subscribedAt: -1 });

    const subscribers = subscriptions.map((sub: any) => {
      const user = sub.userId;
      const transformedSubscriber: any = {
        ...user.toObject(),
        id: user._id,
        subscriptionId: sub._id,
        subscribedAt: sub.subscribedAt,
      };
      delete transformedSubscriber._id;
      delete transformedSubscriber.__v;
      return transformedSubscriber;
    });

    res.status(200).json({
      status: "success",
      data: {
        bot: {
          id: bot._id,
          name: bot.name,
        },
        subscribers,
        totalSubscribers: subscribers.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/bots/:id
 * @desc Update a bot by ID
 * @access Private
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      recommendedCapital,
      performanceDuration,
      currency,
      script,
      groupId,
    } = req.body;

    // Validate at least one field is provided
    if (
      !name &&
      !description &&
      recommendedCapital === undefined &&
      !performanceDuration &&
      !currency &&
      !script &&
      !groupId
    ) {
      throw new AppError(
        "Please provide at least one field to update",
        400,
        "no-update-fields"
      );
    }

    // Check if bot exists
    const existingBot = await Bot.findById(id);
    if (!existingBot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Check if groupId is being updated and if the group exists
    if (groupId && groupId !== existingBot.groupId.toString()) {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new AppError("Group not found", 404, "group-not-found");
      }
    }

    // Check if name is being updated and if it conflicts with another bot
    if (name && name !== existingBot.name) {
      const nameConflict = await Bot.findOne({ name, _id: { $ne: id } });
      if (nameConflict) {
        throw new AppError(
          "Bot with this name already exists",
          409,
          "duplicate-bot-name"
        );
      }
    }

    // Prepare update object
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (recommendedCapital !== undefined)
      updateData.recommendedCapital = recommendedCapital;
    if (performanceDuration)
      updateData.performanceDuration = performanceDuration;
    if (currency !== undefined) updateData.currency = currency;
    if (script !== undefined) updateData.script = script;
    if (groupId) updateData.groupId = groupId;
    // Update bot
    const bot = await Bot.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-__v");

    if (!bot) {
      throw new AppError("Failed to update bot", 500, "bot-update-failed");
    }

    // Transform response to convert _id to id
    const transformedBot = {
      ...bot.toObject(),
      id: bot._id,
    };
    delete transformedBot._id;

    res.status(200).json({
      status: "success",
      message: "Bot updated successfully",
      data: transformedBot,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/bots/:id
 * @desc Delete a bot by ID
 * @access Private
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const bot = await Bot.findByIdAndDelete(id);

    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    res.status(200).json({
      status: "success",
      message: "Bot deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/bots/subscribed
 * @desc Get bots that the authenticated user is subscribed to
 * @access Private
 */
router.get("/subscribed", async (req, res, next) => {
  try {
    const BotSubscription = require("../models/BotSubscription").default;

    const subscriptions = await BotSubscription.find({
      userId: req.user._id,
      status: "active",
    }).populate("botId");

    const subscribedBots = subscriptions.map((sub: any) => {
      const bot = sub.botId;
      const transformedBot: any = {
        ...bot.toObject(),
        id: bot._id,
        subscriptionId: sub._id,
        subscribedAt: sub.subscribedAt,
      };
      delete transformedBot._id;
      delete transformedBot.__v;
      return transformedBot;
    });

    res.status(200).json({
      status: "success",
      data: subscribedBots,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/bots/:id/performance-overview
 * @desc Get performance overview for a specific bot
 * @access Private
 */
router.get("/:id/performance-overview", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if bot exists
    const bot = await Bot.findById(id);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Get all signals for this bot
    const Signal = require("../models/Signal").default;
    const signals = await Signal.find({ botId: id });

    // Filter completed signals (those with exitTime and profitLoss)
    const completedSignals = signals.filter(
      (signal: any) => signal.exitTime && signal.profitLoss !== undefined
    );

    const totalReturn = completedSignals.reduce(
      (sum: number, signal: any) => sum + (signal.profitLoss || 0),
      0
    );

    // Calculate win rate
    const winningSignals = completedSignals.filter(
      (signal: any) => (signal.profitLoss || 0) > 0
    );
    const winRate =
      completedSignals.length > 0
        ? (winningSignals.length / completedSignals.length) * 100
        : 0;

    // Calculate profit factor
    const totalWins = winningSignals.reduce(
      (sum: number, signal: any) => sum + (signal.profitLoss || 0),
      0
    );
    const losingSignals = completedSignals.filter(
      (signal: any) => (signal.profitLoss || 0) < 0
    );
    const totalLosses = Math.abs(
      losingSignals.reduce(
        (sum: number, signal: any) => sum + (signal.profitLoss || 0),
        0
      )
    );
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    res.status(200).json({
      status: "success",
      data: {
        totalTrades: completedSignals.length,
        totalReturn: Math.round(totalReturn * 100) / 100, // Round to 2 decimal places
        winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
        profitFactor: Math.round(profitFactor * 100) / 100, // Round to 2 decimal places
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
