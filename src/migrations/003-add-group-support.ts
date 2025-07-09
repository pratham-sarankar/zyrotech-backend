import "dotenv/config";
import mongoose from "mongoose";
import Bot from "../models/Bot";
import Group from "../models/Group";

/**
 * Migration: Add Group support to Bot entities
 *
 * This migration:
 * - Creates a default group if no groups exist
 * - Updates all existing bots to belong to the default group
 * - Ensures all bots have a groupId field
 */
export async function addGroupSupportMigration() {
  try {
    console.log("Starting migration: Add Group support to Bot entities...");

    // Check if any groups exist
    const existingGroups = await Group.find({});
    console.log(`Found ${existingGroups.length} existing groups`);

    let defaultGroup;

    if (existingGroups.length === 0) {
      // Create a default group
      console.log("Creating default group...");
      defaultGroup = await Group.create({
        name: "Default Group",
      });
      console.log(`Created default group with ID: ${defaultGroup._id}`);
    } else {
      // Use the first existing group as default
      defaultGroup = existingGroups[0];
      console.log(
        `Using existing group as default: ${defaultGroup.name} (${defaultGroup._id})`
      );
    }

    // Get all existing bots
    const bots = await Bot.find({});
    console.log(`Found ${bots.length} existing bots to update`);

    // Update bots that don't have a groupId
    const botsWithoutGroup = bots.filter((bot) => !bot.groupId);
    console.log(`Found ${botsWithoutGroup.length} bots without groupId`);

    if (botsWithoutGroup.length > 0) {
      // Use native MongoDB operations to update all bots without groupId
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }
      const collection = db.collection("bots");

      const result = await collection.updateMany(
        { groupId: { $exists: false } },
        { $set: { groupId: defaultGroup._id } }
      );

      console.log(
        `Successfully updated ${result.modifiedCount} bots with groupId`
      );
    } else {
      console.log("All bots already have groupId");
    }

    console.log("Migration completed successfully!");

    return {
      success: true,
      totalBots: bots.length,
      botsUpdated: botsWithoutGroup.length,
      defaultGroupId: defaultGroup._id,
      defaultGroupName: defaultGroup.name,
    };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback function to remove group support
 * Use this only if you need to revert the migration
 */
export async function rollbackGroupSupportMigration() {
  try {
    console.log("Starting rollback: Remove Group support from Bot entities...");

    const bots = await Bot.find({});
    console.log(`Found ${bots.length} bots to rollback`);

    // Use native MongoDB operations to remove groupId field
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }
    const collection = db.collection("bots");

    const result = await collection.updateMany(
      { groupId: { $exists: true } },
      { $unset: { groupId: 1 } }
    );

    console.log(
      `Successfully removed groupId from ${result.modifiedCount} bots`
    );
    console.log("Rollback completed successfully!");

    return {
      success: true,
      totalBots: bots.length,
      botsRolledBack: result.modifiedCount,
    };
  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB
  const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/zyrotech";

  mongoose
    .connect(MONGODB_URI)
    .then(async () => {
      console.log("Connected to MongoDB");

      const command = process.argv[2];

      if (command === "rollback") {
        await rollbackGroupSupportMigration();
      } else {
        await addGroupSupportMigration();
      }

      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to connect to MongoDB:", error);
      process.exit(1);
    });
}
