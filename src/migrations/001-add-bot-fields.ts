import "dotenv/config";
import mongoose from "mongoose";
import Bot from "../models/Bot";

/**
 * Migration: Update Bot schema fields
 *
 * This migration:
 * - Removes the html field from existing bot documents
 * - Adds/updates the following fields:
 *   - description: string (required)
 *   - recommendedCapital: number (required)
 *   - performanceDuration: string (optional, default: "1M")
 *   - currency: string (optional, default: "USD")
 */
export async function addBotFieldsMigration() {
  try {
    console.log("Starting migration: Update Bot schema fields...");

    // Get all existing bots
    const bots = await Bot.find({});
    console.log(`Found ${bots.length} existing bots to update`);

    // Update each bot with default values for new fields
    const updatePromises = bots.map(async (bot) => {
      const updateData: any = {};

      // Force update all fields to ensure they exist in the database with proper defaults
      updateData.description =
        bot.description ||
        "A fully automated trading bot that uses advanced AI to analyze markets, predict opportunities, and execute trades in real-time. It works 24/7 to maximize profits and reduce risks — all without human intervention.";
      updateData.recommendedCapital = bot.recommendedCapital || 1000;
      updateData.performanceDuration = bot.performanceDuration || "1M";
      updateData.currency = bot.currency || "USD";

      console.log(`Updating bot ${bot.name} with fields:`, [
        "description",
        "recommendedCapital",
        "performanceDuration",
        "currency",
      ]);
      console.log(`Current values:`, {
        description: updateData.description,
        recommendedCapital: updateData.recommendedCapital,
        performanceDuration: updateData.performanceDuration,
        currency: updateData.currency,
      });
      console.log(`Removing html field from bot ${bot.name}`);

      // Use native MongoDB operations to ensure html field is removed
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }
      const collection = db.collection("bots");

      // First, remove the html field using native MongoDB
      await collection.updateOne(
        { _id: bot._id as any },
        { $unset: { html: 1 } }
      );

      // Then, update/add the other fields
      return Bot.findByIdAndUpdate(
        bot._id,
        {
          $set: {
            description: updateData.description,
            recommendedCapital: updateData.recommendedCapital,
            performanceDuration: updateData.performanceDuration,
            currency: updateData.currency,
          },
        },
        { new: true, runValidators: false }
      );
    });

    const results = await Promise.all(updatePromises);
    const updatedCount = results.filter((result) => result !== null).length;

    console.log(`Successfully updated ${updatedCount} bots`);
    console.log("Migration completed successfully!");

    return {
      success: true,
      totalBots: bots.length,
      updatedBots: updatedCount,
    };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback function to restore the original schema
 * Use this only if you need to revert the migration
 */
export async function rollbackBotFieldsMigration() {
  try {
    console.log("Starting rollback: Restore original Bot schema...");

    const bots = await Bot.find({});
    console.log(`Found ${bots.length} bots to rollback`);

    const updatePromises = bots.map(async (bot) => {
      return Bot.findByIdAndUpdate(
        bot._id,
        {
          $unset: {
            description: 1,
            recommendedCapital: 1,
            performanceDuration: 1,
            currency: 1,
          },
          $set: {
            html: "<div>Bot interface HTML</div>",
          },
        },
        { new: true }
      );
    });

    const results = await Promise.all(updatePromises);
    console.log(`Successfully rolled back ${results.length} bots`);
    console.log("Rollback completed successfully!");

    return {
      success: true,
      totalBots: bots.length,
      rolledBackBots: results.length,
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
        await rollbackBotFieldsMigration();
      } else {
        await addBotFieldsMigration();
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
