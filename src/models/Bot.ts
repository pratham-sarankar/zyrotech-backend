import mongoose, { Document } from "mongoose";

/**
 * Interface for Bot document
 */
export interface IBot extends Document {
  name: string;
  html: string;
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
    html: {
      type: String,
      required: [true, "Bot HTML content is required"],
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Bot = mongoose.model<IBot>("Bot", botSchema);

export default Bot;
