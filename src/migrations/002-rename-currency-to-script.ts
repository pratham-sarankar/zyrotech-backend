import "dotenv/config";
import mongoose from "mongoose";
import Bot from "../models/Bot";

/**
 * Migration: Rename currency field to script in Bot documents
 *
 * This migration:
 * - Renames the 'currency' field to 'script' in all existing bot documents
 * - Preserves all existing currency values
 * - Updates the field name to match the new schema
 */
export async function renameCurrencyToScriptMigration() {
  try {
    console.log("Starting migration: Rename currency field to script...");

    // Get all existing bots
    const bots = await Bot.find({});
    console.log(`Found ${bots.length} existing bots to update`);

    // Use native MongoDB operations to rename the field
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }
    const collection = db.collection("bots");

    // Rename currency field to script for all documents
    const result = await collection.updateMany(
      { currency: { $exists: true } },
      [
        {
          $addFields: {
            script: "$currency",
          },
        },
        {
          $unset: "currency",
        },
      ]
    );

    console.log(`Successfully updated ${result.modifiedCount} bots`);
    console.log("Migration completed successfully!");

    return {
      success: true,
      totalBots: bots.length,
      updatedBots: result.modifiedCount,
    };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback function to restore the currency field
 * Use this only if you need to revert the migration
 */
export async function rollbackCurrencyToScriptMigration() {
  try {
    console.log("Starting rollback: Restore currency field...");

    const bots = await Bot.find({});
    console.log(`Found ${bots.length} bots to rollback`);

    // Use native MongoDB operations to rename the field back
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }
    const collection = db.collection("bots");

    // Rename script field back to currency for all documents
    const result = await collection.updateMany({ script: { $exists: true } }, [
      {
        $addFields: {
          currency: "$script",
        },
      },
      {
        $unset: "script",
      },
    ]);

    console.log(`Successfully rolled back ${result.modifiedCount} bots`);
    console.log("Rollback completed successfully!");

    return {
      success: true,
      totalBots: bots.length,
      rolledBackBots: result.modifiedCount,
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
        await rollbackCurrencyToScriptMigration();
      } else {
        await renameCurrencyToScriptMigration();
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
