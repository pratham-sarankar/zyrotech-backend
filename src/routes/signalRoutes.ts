import express from "express";
import { auth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import Signal from "../models/Signal";
import Bot from "../models/Bot";

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
    next(error);
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
    next(error);
  }
});

/**
 * @route GET /api/signals
 * @desc Get all signals with optional filtering
 * @access Private
 */
router.get("/", async (req, res, next) => {
  try {
    const { botId, direction, limit = 50, page = 1 } = req.query;

    // Build query
    const query: any = {};
    if (botId) query.botId = botId;
    if (direction && ["LONG", "SHORT"].includes(direction as string)) {
      query.direction = direction;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const signals = await Signal.find(query)
      .populate("botId", "name")
      .select("-__v")
      .sort({ signalTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalSignals = await Signal.countDocuments(query);

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
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalSignals / Number(limit)),
        totalSignals,
        hasNextPage: skip + signals.length < totalSignals,
        hasPrevPage: Number(page) > 1,
      },
    });
  } catch (error) {
    next(error);
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
    next(error);
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
    next(error);
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
    next(error);
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
    const { direction, limit = 50, page = 1 } = req.query;

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

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const signals = await Signal.find(query)
      .select("-__v")
      .sort({ signalTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalSignals = await Signal.countDocuments(query);

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
    next(error);
  }
});

export default router;
