import mongoose, { Document } from "mongoose";

/**
 * Interface for Group document
 */
export interface IGroup extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Group Schema
 */
const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
      unique: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Group = mongoose.model<IGroup>("Group", groupSchema);

export default Group;
