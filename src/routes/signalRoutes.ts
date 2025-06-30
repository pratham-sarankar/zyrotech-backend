import express from "express";
import { auth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import Signal from "../models/Signal";
import Bot from "../models/Bot";
import BotSubscription from "../models/BotSubscription";
import mongoose from "mongoose";

const router = express.Router();

// All signal routes require authentication
router.use(auth);

/**
 * @route POST /api/signals
 * @desc Create a new signal
 * @access Private
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      botId,
      tradeId,
      direction,
      signalTime,
      entryTime,
      entryPrice,
      stoploss,
      target1r,
      target2r,
      exitTime,
      exitPrice,
      exitReason,
      profitLoss,
      profitLossR,
      trailCount,
    } = req.body;

    // Validate required fields
    if (
      !botId ||
      !tradeId ||
      !direction ||
      !signalTime ||
      !entryTime ||
      !entryPrice ||
      !stoploss ||
      !target1r ||
      !target2r ||
      !exitTime ||
      !exitPrice ||
      trailCount === undefined
    ) {
      throw new AppError(
        "Please provide all required fields",
        400,
        "missing-required-fields"
      );
    }

    // Validate direction
    if (!["LONG", "SHORT"].includes(direction)) {
      throw new AppError(
        "Direction must be either LONG or SHORT",
        400,
        "invalid-direction"
      );
    }

    // Check if bot exists
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Check if signal with same tradeId already exists for this bot
    const existingSignal = await Signal.findOne({ botId, tradeId });
    if (existingSignal) {
      throw new AppError(
        "Signal with this trade ID already exists for this bot",
        409,
        "duplicate-trade-id"
      );
    }

    // Create new signal
    const signal = await Signal.create({
      botId,
      tradeId,
      direction,
      signalTime: new Date(signalTime),
      entryTime: new Date(entryTime),
      entryPrice,
      stoploss,
      target1r,
      target2r,
      exitTime: new Date(exitTime),
      exitPrice,
      exitReason,
      profitLoss,
      profitLossR,
      trailCount,
    });

    // Transform response
    const transformedSignal: any = {
      ...signal.toObject(),
      id: signal._id,
    };
    delete transformedSignal._id;
    delete transformedSignal.__v;

    // Transform botId to bot format
    if (transformedSignal.botId) {
      transformedSignal.bot = {
        id: transformedSignal.botId._id,
        name: transformedSignal.botId.name,
      };
      delete transformedSignal.botId;
    }

    res.status(201).json({
      status: "success",
      message: "Signal created successfully",
      data: transformedSignal,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route POST /api/signals/bulk
 * @desc Create multiple signals in bulk for a bot
 * @access Private
 */
router.post("/bulk", async (req, res, next) => {
  try {
    const { botId, signals } = req.body;

    // Validate required fields
    if (!botId || !signals || !Array.isArray(signals)) {
      throw new AppError(
        "Please provide botId and signals array",
        400,
        "missing-required-fields"
      );
    }

    // Check if bot exists
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Prepare signals data
    const signalsData = signals.map((signal) => ({
      botId,
      tradeId: signal.tradeId,
      direction: signal.direction,
      signalTime: new Date(signal.signalTime),
      entryTime: new Date(signal.entryTime),
      entryPrice: signal.entryPrice,
      stoploss: signal.stoploss,
      target1r: signal.target1r,
      target2r: signal.target2r,
      exitTime: new Date(signal.exitTime),
      exitPrice: signal.exitPrice,
      exitReason: signal.exitReason,
      profitLoss: signal.profitLoss,
      profitLossR: signal.profitLossR,
      trailCount: signal.trailCount,
    }));

    // Create signals in bulk
    const createdSignals = await Signal.insertMany(signalsData);

    // Transform response
    const transformedSignals = createdSignals.map((signal) => {
      const transformedSignal: any = {
        ...signal.toObject(),
        id: signal._id,
      };
      delete transformedSignal._id;
      delete transformedSignal.__v;
      return transformedSignal;
    });

    res.status(201).json({
      status: "success",
      message: `Successfully created ${createdSignals.length} signals`,
      data: {
        bot: {
          id: bot._id,
          name: bot.name,
        },
        signals: transformedSignals,
        totalCreated: createdSignals.length,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route GET /api/signals
 * @desc Get all signals with optional filtering
 * @access Private
 */
router.get("/", async (req, res, next) => {
  try {
    const {
      botId,
      direction,
      limit = 50,
      page = 1,
      startDate,
      endDate,
      date,
      today,
      yesterday,
      thisWeek,
      thisMonth,
    } = req.query;

    // Build query
    const query: any = {};
    if (botId) query.botId = botId;
    if (direction && ["LONG", "SHORT"].includes(direction as string)) {
      query.direction = direction;
    }

    // Convert botId to ObjectId if it's a string (for aggregation compatibility)
    if (query.botId && typeof query.botId === "string") {
      query.botId = new mongoose.Types.ObjectId(query.botId);
    }

    // Date filtering
    if (
      startDate ||
      endDate ||
      date ||
      (today && ["true", "1", "yes"].includes(today as string)) ||
      (yesterday && ["true", "1", "yes"].includes(yesterday as string)) ||
      (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) ||
      (thisMonth && ["true", "1", "yes"].includes(thisMonth as string))
    ) {
      query.signalTime = {};

      // Validate date parameters
      const validateDate = (dateStr: string, paramName: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new AppError(
            `Invalid ${paramName} format. Please use ISO date format (YYYY-MM-DD)`,
            400,
            "invalid-date-format"
          );
        }
        return date;
      };

      // Exact date filter
      if (date) {
        const targetDate = validateDate(date as string, "date");
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        query.signalTime.$gte = targetDate;
        query.signalTime.$lt = nextDay;
      }

      // Date range filter
      if (startDate) {
        query.signalTime.$gte = validateDate(startDate as string, "startDate");
      }
      if (endDate) {
        const endDateTime = validateDate(endDate as string, "endDate");
        endDateTime.setDate(endDateTime.getDate() + 1); // Include the entire end date
        query.signalTime.$lt = endDateTime;
      }

      // Common date range filters
      if (today && ["true", "1", "yes"].includes(today as string)) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        query.signalTime.$gte = todayStart;
        query.signalTime.$lte = todayEnd;
      }

      if (yesterday && ["true", "1", "yes"].includes(yesterday as string)) {
        const yesterdayStart = new Date();
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date();
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);

        query.signalTime.$gte = yesterdayStart;
        query.signalTime.$lte = yesterdayEnd;
      }

      if (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        query.signalTime.$gte = startOfWeek;
      }

      if (thisMonth && ["true", "1", "yes"].includes(thisMonth as string)) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        query.signalTime.$gte = startOfMonth;
      }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get signals with pagination
    const signals = await Signal.find(query)
      .populate("botId", "name")
      .select("-__v")
      .sort({ signalTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalSignals = await Signal.countDocuments(query);

    // Get performance overview using a single aggregation query
    const overviewAgg = await Signal.aggregate([
      { $match: query },
      { $sort: { signalTime: 1 } }, // Sort by signal time to track consecutive streaks
      {
        $group: {
          _id: null,
          totalSignals: { $sum: 1 },
          totalLongSignals: {
            $sum: { $cond: [{ $eq: ["$direction", "LONG"] }, 1, 0] },
          },
          totalShortSignals: {
            $sum: { $cond: [{ $eq: ["$direction", "SHORT"] }, 1, 0] },
          },
          highestProfit: { $max: "$profitLoss" },
          highestLoss: { $min: "$profitLoss" },
          totalPnL: { $sum: "$profitLoss" },
          signals: { $push: { profitLoss: "$profitLoss" } },
        },
      },
      {
        $addFields: {
          consecutiveWins: {
            $let: {
              vars: {
                winStreaks: {
                  $reduce: {
                    input: "$signals",
                    initialValue: { currentStreak: 0, maxStreak: 0 },
                    in: {
                      currentStreak: {
                        $cond: [
                          { $gt: ["$$this.profitLoss", 0] },
                          { $add: ["$$value.currentStreak", 1] },
                          0,
                        ],
                      },
                      maxStreak: {
                        $max: [
                          "$$value.maxStreak",
                          {
                            $cond: [
                              { $gt: ["$$this.profitLoss", 0] },
                              { $add: ["$$value.currentStreak", 1] },
                              "$$value.maxStreak",
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$winStreaks.maxStreak",
            },
          },
          consecutiveLosses: {
            $let: {
              vars: {
                lossStreaks: {
                  $reduce: {
                    input: "$signals",
                    initialValue: { currentStreak: 0, maxStreak: 0 },
                    in: {
                      currentStreak: {
                        $cond: [
                          { $lt: ["$$this.profitLoss", 0] },
                          { $add: ["$$value.currentStreak", 1] },
                          0,
                        ],
                      },
                      maxStreak: {
                        $max: [
                          "$$value.maxStreak",
                          {
                            $cond: [
                              { $lt: ["$$this.profitLoss", 0] },
                              { $add: ["$$value.currentStreak", 1] },
                              "$$value.maxStreak",
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$lossStreaks.maxStreak",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSignals: 1,
          totalLongSignals: 1,
          totalShortSignals: 1,
          highestProfit: 1,
          highestLoss: 1,
          totalPnL: 1,
          consecutiveWins: 1,
          consecutiveLosses: 1,
        },
      },
    ]);
    const overview = overviewAgg[0] || {
      totalSignals: 0,
      totalLongSignals: 0,
      totalShortSignals: 0,
      highestProfit: 0,
      highestLoss: 0,
      totalPnL: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };

    // Transform response
    const transformedSignals = signals.map((signal) => {
      const transformedSignal: any = {
        ...signal.toObject(),
        id: signal._id,
      };
      delete transformedSignal._id;

      // Transform botId to bot format
      if (transformedSignal.botId) {
        transformedSignal.bot = {
          id: transformedSignal.botId._id,
          name: transformedSignal.botId.name,
        };
        delete transformedSignal.botId;
      }

      return transformedSignal;
    });

    res.status(200).json({
      status: "success",
      data: transformedSignals,
      performanceOverview: overview,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalSignals / Number(limit)),
        totalSignals,
        hasNextPage: skip + signals.length < totalSignals,
        hasPrevPage: Number(page) > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route GET /api/signals/user
 * @desc Get all signals from bots the user has subscribed to
 * @access Private
 */
router.get("/user", async (req, res, next) => {
  try {
    const {
      direction,
      limit = 50,
      page = 1,
      startDate,
      endDate,
      date,
      today,
      yesterday,
      thisWeek,
      thisMonth,
      status, // 'opened' or 'closed'
    } = req.query;

    // Get user ID from auth middleware
    const userId = req.user.id;

    // Get all active bot subscriptions for the user
    const userSubscriptions = await BotSubscription.find({
      userId: userId,
      status: "active",
    }).select("botId");

    const activeBotsCount = userSubscriptions.length;

    if (userSubscriptions.length === 0) {
      return res.status(200).json({
        status: "success",
        data: [],
        activeBotsCount: 0,
        performanceOverview: {
          totalSignals: 0,
          totalLongSignals: 0,
          totalShortSignals: 0,
          highestProfit: 0,
          highestLoss: 0,
          totalPnL: 0,
          consecutiveWins: 0,
          consecutiveLosses: 0,
        },
        pagination: {
          currentPage: Number(page),
          totalPages: 0,
          totalSignals: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    // Extract bot IDs from subscriptions
    const botIds = userSubscriptions.map((sub) => sub.botId);

    // Build query
    const query: any = { botId: { $in: botIds } };
    if (direction && ["LONG", "SHORT"].includes(direction as string)) {
      query.direction = direction;
    }

    // Status filtering (opened vs closed signals)
    if (status && ["opened", "closed"].includes(status as string)) {
      if (status === "opened") {
        // Opened signals: no exitTime or exitPrice
        query.$or = [
          { exitTime: { $exists: false } },
          { exitTime: null },
          { exitPrice: { $exists: false } },
          { exitPrice: null },
        ];
      } else if (status === "closed") {
        // Closed signals: have both exitTime and exitPrice
        query.exitTime = { $exists: true, $ne: null };
        query.exitPrice = { $exists: true, $ne: null };
      }
    }

    // Date filtering
    if (
      startDate ||
      endDate ||
      date ||
      (today && ["true", "1", "yes"].includes(today as string)) ||
      (yesterday && ["true", "1", "yes"].includes(yesterday as string)) ||
      (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) ||
      (thisMonth && ["true", "1", "yes"].includes(thisMonth as string))
    ) {
      query.signalTime = {};

      // Validate date parameters
      const validateDate = (dateStr: string, paramName: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new AppError(
            `Invalid ${paramName} format. Please use ISO date format (YYYY-MM-DD)`,
            400,
            "invalid-date-format"
          );
        }
        return date;
      };

      // Exact date filter
      if (date) {
        const targetDate = validateDate(date as string, "date");
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        query.signalTime.$gte = targetDate;
        query.signalTime.$lt = nextDay;
      }

      // Date range filter
      if (startDate) {
        query.signalTime.$gte = validateDate(startDate as string, "startDate");
      }
      if (endDate) {
        const endDateTime = validateDate(endDate as string, "endDate");
        endDateTime.setDate(endDateTime.getDate() + 1); // Include the entire end date
        query.signalTime.$lt = endDateTime;
      }

      // Common date range filters
      if (today && ["true", "1", "yes"].includes(today as string)) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        query.signalTime.$gte = todayStart;
        query.signalTime.$lte = todayEnd;
      }

      if (yesterday && ["true", "1", "yes"].includes(yesterday as string)) {
        const yesterdayStart = new Date();
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date();
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);

        query.signalTime.$gte = yesterdayStart;
        query.signalTime.$lte = yesterdayEnd;
      }

      if (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        query.signalTime.$gte = startOfWeek;
      }

      if (thisMonth && ["true", "1", "yes"].includes(thisMonth as string)) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        query.signalTime.$gte = startOfMonth;
      }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get signals with pagination
    const signals = await Signal.find(query)
      .populate("botId", "name")
      .select("-__v")
      .sort({ signalTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalSignals = await Signal.countDocuments(query);

    // Get performance overview using a single aggregation query
    const overviewAgg = await Signal.aggregate([
      { $match: query },
      { $sort: { signalTime: 1 } }, // Sort by signal time to track consecutive streaks
      {
        $group: {
          _id: null,
          totalSignals: { $sum: 1 },
          totalLongSignals: {
            $sum: { $cond: [{ $eq: ["$direction", "LONG"] }, 1, 0] },
          },
          totalShortSignals: {
            $sum: { $cond: [{ $eq: ["$direction", "SHORT"] }, 1, 0] },
          },
          highestProfit: { $max: "$profitLoss" },
          highestLoss: { $min: "$profitLoss" },
          totalPnL: { $sum: "$profitLoss" },
          signals: { $push: { profitLoss: "$profitLoss" } },
        },
      },
      {
        $addFields: {
          consecutiveWins: {
            $let: {
              vars: {
                winStreaks: {
                  $reduce: {
                    input: "$signals",
                    initialValue: { currentStreak: 0, maxStreak: 0 },
                    in: {
                      currentStreak: {
                        $cond: [
                          { $gt: ["$$this.profitLoss", 0] },
                          { $add: ["$$value.currentStreak", 1] },
                          0,
                        ],
                      },
                      maxStreak: {
                        $max: [
                          "$$value.maxStreak",
                          {
                            $cond: [
                              { $gt: ["$$this.profitLoss", 0] },
                              { $add: ["$$value.currentStreak", 1] },
                              "$$value.maxStreak",
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$winStreaks.maxStreak",
            },
          },
          consecutiveLosses: {
            $let: {
              vars: {
                lossStreaks: {
                  $reduce: {
                    input: "$signals",
                    initialValue: { currentStreak: 0, maxStreak: 0 },
                    in: {
                      currentStreak: {
                        $cond: [
                          { $lt: ["$$this.profitLoss", 0] },
                          { $add: ["$$value.currentStreak", 1] },
                          0,
                        ],
                      },
                      maxStreak: {
                        $max: [
                          "$$value.maxStreak",
                          {
                            $cond: [
                              { $lt: ["$$this.profitLoss", 0] },
                              { $add: ["$$value.currentStreak", 1] },
                              "$$value.maxStreak",
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$lossStreaks.maxStreak",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSignals: 1,
          totalLongSignals: 1,
          totalShortSignals: 1,
          highestProfit: 1,
          highestLoss: 1,
          totalPnL: 1,
          consecutiveWins: 1,
          consecutiveLosses: 1,
        },
      },
    ]);
    const overview = overviewAgg[0] || {
      totalSignals: 0,
      totalLongSignals: 0,
      totalShortSignals: 0,
      highestProfit: 0,
      highestLoss: 0,
      totalPnL: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };

    // Transform response
    const transformedSignals = signals.map((signal) => {
      const transformedSignal: any = {
        ...signal.toObject(),
        id: signal._id,
      };
      delete transformedSignal._id;

      // Transform botId to bot format
      if (transformedSignal.botId) {
        transformedSignal.bot = {
          id: transformedSignal.botId._id,
          name: transformedSignal.botId.name,
        };
        delete transformedSignal.botId;
      }

      return transformedSignal;
    });

    res.status(200).json({
      status: "success",
      data: transformedSignals,
      activeBotsCount: activeBotsCount,
      performanceOverview: overview,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalSignals / Number(limit)),
        totalSignals,
        hasNextPage: skip + signals.length < totalSignals,
        hasPrevPage: Number(page) > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route GET /api/signals/:id
 * @desc Get a specific signal by ID
 * @access Private
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const signal = await Signal.findById(id)
      .populate("botId", "name")
      .select("-__v");

    if (!signal) {
      throw new AppError("Signal not found", 404, "signal-not-found");
    }

    // Transform response
    const transformedSignal: any = {
      ...signal.toObject(),
      id: signal._id,
    };
    delete transformedSignal._id;

    // Transform botId to bot format
    if (transformedSignal.botId) {
      transformedSignal.bot = {
        id: transformedSignal.botId._id,
        name: transformedSignal.botId.name,
      };
      delete transformedSignal.botId;
    }

    res.status(200).json({
      status: "success",
      data: transformedSignal,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route PUT /api/signals/:id
 * @desc Update a signal by ID
 * @access Private
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      direction,
      signalTime,
      entryTime,
      entryPrice,
      stoploss,
      target1r,
      target2r,
      exitTime,
      exitPrice,
      exitReason,
      profitLoss,
      profitLossR,
      trailCount,
    } = req.body;

    // Check if signal exists
    const existingSignal = await Signal.findById(id);
    if (!existingSignal) {
      throw new AppError("Signal not found", 404, "signal-not-found");
    }

    // Validate direction if provided
    if (direction && !["LONG", "SHORT"].includes(direction)) {
      throw new AppError(
        "Direction must be either LONG or SHORT",
        400,
        "invalid-direction"
      );
    }

    // Prepare update object
    const updateData: any = {};
    if (direction) updateData.direction = direction;
    if (signalTime) updateData.signalTime = new Date(signalTime);
    if (entryTime) updateData.entryTime = new Date(entryTime);
    if (entryPrice !== undefined) updateData.entryPrice = entryPrice;
    if (stoploss !== undefined) updateData.stoploss = stoploss;
    if (target1r !== undefined) updateData.target1r = target1r;
    if (target2r !== undefined) updateData.target2r = target2r;
    if (exitTime) updateData.exitTime = new Date(exitTime);
    if (exitPrice !== undefined) updateData.exitPrice = exitPrice;
    if (exitReason !== undefined) updateData.exitReason = exitReason;
    if (profitLoss !== undefined) updateData.profitLoss = profitLoss;
    if (profitLossR !== undefined) updateData.profitLossR = profitLossR;
    if (trailCount !== undefined) updateData.trailCount = trailCount;

    // Update signal
    const signal = await Signal.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("botId", "name")
      .select("-__v");

    if (!signal) {
      throw new AppError(
        "Failed to update signal",
        500,
        "signal-update-failed"
      );
    }

    // Transform response
    const transformedSignal: any = {
      ...signal.toObject(),
      id: signal._id,
    };
    delete transformedSignal._id;

    // Transform botId to bot format
    if (transformedSignal.botId) {
      transformedSignal.bot = {
        id: transformedSignal.botId._id,
        name: transformedSignal.botId.name,
      };
      delete transformedSignal.botId;
    }

    res.status(200).json({
      status: "success",
      message: "Signal updated successfully",
      data: transformedSignal,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route DELETE /api/signals/:id
 * @desc Delete a signal by ID
 * @access Private
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const signal = await Signal.findByIdAndDelete(id);

    if (!signal) {
      throw new AppError("Signal not found", 404, "signal-not-found");
    }

    res.status(200).json({
      status: "success",
      message: "Signal deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route GET /api/signals/bot/:botId
 * @desc Get all signals for a specific bot
 * @access Private
 */
router.get("/bot/:botId", async (req, res, next) => {
  try {
    const { botId } = req.params;
    const {
      direction,
      limit = 50,
      page = 1,
      startDate,
      endDate,
      date,
      today,
      yesterday,
      thisWeek,
      thisMonth,
    } = req.query;

    // Check if bot exists
    const bot = await Bot.findById(botId);
    if (!bot) {
      throw new AppError("Bot not found", 404, "bot-not-found");
    }

    // Build query
    const query: any = { botId };
    if (direction && ["LONG", "SHORT"].includes(direction as string)) {
      query.direction = direction;
    }

    // Convert botId to ObjectId if it's a string (for aggregation compatibility)
    if (query.botId && typeof query.botId === "string") {
      query.botId = new mongoose.Types.ObjectId(query.botId);
    }

    // Date filtering
    if (
      startDate ||
      endDate ||
      date ||
      (today && ["true", "1", "yes"].includes(today as string)) ||
      (yesterday && ["true", "1", "yes"].includes(yesterday as string)) ||
      (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) ||
      (thisMonth && ["true", "1", "yes"].includes(thisMonth as string))
    ) {
      query.signalTime = {};

      // Validate date parameters
      const validateDate = (dateStr: string, paramName: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new AppError(
            `Invalid ${paramName} format. Please use ISO date format (YYYY-MM-DD)`,
            400,
            "invalid-date-format"
          );
        }
        return date;
      };

      // Exact date filter
      if (date) {
        const targetDate = validateDate(date as string, "date");
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        query.signalTime.$gte = targetDate;
        query.signalTime.$lt = nextDay;
      }

      // Date range filter
      if (startDate) {
        query.signalTime.$gte = validateDate(startDate as string, "startDate");
      }
      if (endDate) {
        const endDateTime = validateDate(endDate as string, "endDate");
        endDateTime.setDate(endDateTime.getDate() + 1); // Include the entire end date
        query.signalTime.$lt = endDateTime;
      }

      // Common date range filters
      if (today && ["true", "1", "yes"].includes(today as string)) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        query.signalTime.$gte = todayStart;
        query.signalTime.$lte = todayEnd;
      }

      if (yesterday && ["true", "1", "yes"].includes(yesterday as string)) {
        const yesterdayStart = new Date();
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date();
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);

        query.signalTime.$gte = yesterdayStart;
        query.signalTime.$lte = yesterdayEnd;
      }

      if (thisWeek && ["true", "1", "yes"].includes(thisWeek as string)) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        query.signalTime.$gte = startOfWeek;
      }

      if (thisMonth && ["true", "1", "yes"].includes(thisMonth as string)) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        query.signalTime.$gte = startOfMonth;
      }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get signals with pagination
    const signals = await Signal.find(query)
      .select("-__v")
      .sort({ signalTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalSignals = await Signal.countDocuments(query);

    // Get performance overview using a single aggregation query
    const overviewAgg = await Signal.aggregate([
      { $match: query },
      { $sort: { signalTime: 1 } }, // Sort by signal time to track consecutive streaks
      {
        $group: {
          _id: null,
          totalSignals: { $sum: 1 },
          totalLongSignals: {
            $sum: { $cond: [{ $eq: ["$direction", "LONG"] }, 1, 0] },
          },
          totalShortSignals: {
            $sum: { $cond: [{ $eq: ["$direction", "SHORT"] }, 1, 0] },
          },
          highestProfit: { $max: "$profitLoss" },
          highestLoss: { $min: "$profitLoss" },
          totalPnL: { $sum: "$profitLoss" },
          signals: { $push: { profitLoss: "$profitLoss" } },
        },
      },
      {
        $addFields: {
          consecutiveWins: {
            $let: {
              vars: {
                winStreaks: {
                  $reduce: {
                    input: "$signals",
                    initialValue: { currentStreak: 0, maxStreak: 0 },
                    in: {
                      currentStreak: {
                        $cond: [
                          { $gt: ["$$this.profitLoss", 0] },
                          { $add: ["$$value.currentStreak", 1] },
                          0,
                        ],
                      },
                      maxStreak: {
                        $max: [
                          "$$value.maxStreak",
                          {
                            $cond: [
                              { $gt: ["$$this.profitLoss", 0] },
                              { $add: ["$$value.currentStreak", 1] },
                              "$$value.maxStreak",
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$winStreaks.maxStreak",
            },
          },
          consecutiveLosses: {
            $let: {
              vars: {
                lossStreaks: {
                  $reduce: {
                    input: "$signals",
                    initialValue: { currentStreak: 0, maxStreak: 0 },
                    in: {
                      currentStreak: {
                        $cond: [
                          { $lt: ["$$this.profitLoss", 0] },
                          { $add: ["$$value.currentStreak", 1] },
                          0,
                        ],
                      },
                      maxStreak: {
                        $max: [
                          "$$value.maxStreak",
                          {
                            $cond: [
                              { $lt: ["$$this.profitLoss", 0] },
                              { $add: ["$$value.currentStreak", 1] },
                              "$$value.maxStreak",
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$lossStreaks.maxStreak",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSignals: 1,
          totalLongSignals: 1,
          totalShortSignals: 1,
          highestProfit: 1,
          highestLoss: 1,
          totalPnL: 1,
          consecutiveWins: 1,
          consecutiveLosses: 1,
        },
      },
    ]);
    const overview = overviewAgg[0] || {
      totalSignals: 0,
      totalLongSignals: 0,
      totalShortSignals: 0,
      highestProfit: 0,
      highestLoss: 0,
      totalPnL: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };

    // Transform response
    const transformedSignals = signals.map((signal) => {
      const transformedSignal: any = {
        ...signal.toObject(),
        id: signal._id,
      };
      delete transformedSignal._id;
      return transformedSignal;
    });

    res.status(200).json({
      status: "success",
      data: {
        bot: {
          id: bot._id,
          name: bot.name,
        },
        signals: transformedSignals,
        performanceOverview: overview,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalSignals / Number(limit)),
          totalSignals,
          hasNextPage: skip + signals.length < totalSignals,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
