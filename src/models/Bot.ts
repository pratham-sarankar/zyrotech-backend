import mongoose, { Document } from "mongoose";

/**
 * Interface for Bot document
 */
export interface IBot extends Document {
  name: string;
  description: string;
  recommendedCapital: number;
  performanceDuration?: string;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bot Schema
 */
const botSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Bot name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Bot description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    recommendedCapital: {
      type: Number,
      required: [true, "Recommended capital is required"],
      min: [0, "Recommended capital cannot be negative"],
    },
    performanceDuration: {
      type: String,
      enum: {
        values: ["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"],
        message:
          "Performance duration must be one of: 1D, 1W, 1M, 3M, 6M, 1Y, ALL",
      },
      default: "1M",
    },
    currency: {
      type: String,
      trim: true,
      maxlength: [10, "Currency code cannot exceed 10 characters"],
      default: "USD",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Bot = mongoose.model<IBot>("Bot", botSchema);

export default Bot;
