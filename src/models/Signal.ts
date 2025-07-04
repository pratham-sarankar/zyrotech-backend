import mongoose, { Document } from "mongoose";

/**
 * Interface for Signal document
 */
export interface ISignal extends Document {
  botId?: mongoose.Types.ObjectId;
  tradeId?: string;
  direction: "LONG" | "SHORT";
  signalTime?: Date;
  entryTime: Date;
  entryPrice: number;
  stoploss?: number;
  target1r?: number;
  target2r?: number;
  exitTime?: Date;
  exitPrice?: number;
  exitReason?: string;
  profitLoss?: number;
  profitLossR?: number;
  trailCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Signal Schema
 */
const signalSchema = new mongoose.Schema(
  {
    botId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bot",
    },
    tradeId: {
      type: String,
      unique: true,
    },
    direction: {
      type: String,
      required: [true, "Direction is required"],
      enum: {
        values: ["LONG", "SHORT"],
        message: "Direction must be either LONG or SHORT",
      },
    },
    signalTime: {
      type: Date,
    },
    entryTime: {
      type: Date,
      required: [true, "Entry time is required"],
    },
    entryPrice: {
      type: Number,
      required: [true, "Entry price is required"],
      min: [0, "Entry price cannot be negative"],
    },
    stoploss: {
      type: Number,
      min: [0, "Stop loss cannot be negative"],
    },
    target1r: {
      type: Number,
      min: [0, "Target 1R cannot be negative"],
    },
    target2r: {
      type: Number,
      min: [0, "Target 2R cannot be negative"],
    },
    exitTime: {
      type: Date,
    },
    exitPrice: {
      type: Number,
      min: [0, "Exit price cannot be negative"],
    },
    exitReason: {
      type: String,
      trim: true,
    },
    profitLoss: {
      type: Number,
    },
    profitLossR: {
      type: Number,
    },
    trailCount: {
      type: Number,
      min: [0, "Trail count cannot be negative"],
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Compound index to ensure unique tradeId per bot
signalSchema.index({ botId: 1, tradeId: 1 }, { unique: true });

// Indexes for faster queries
signalSchema.index({ botId: 1, signalTime: -1 });
signalSchema.index({ botId: 1, direction: 1 });
signalSchema.index({ signalTime: -1 });
signalSchema.index({ direction: 1 });

export default mongoose.model<ISignal>("Signal", signalSchema);
