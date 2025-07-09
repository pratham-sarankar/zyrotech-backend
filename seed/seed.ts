import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import User from "../src/models/User";
import Group from "../src/models/Group";
import Bot from "../src/models/Bot";
import Signal from "../src/models/Signal";

async function seed() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/zyrotech"
    );
    console.log("Connected to MongoDB");

    // 1. Seed test user
    const testUser = {
      _id: new mongoose.Types.ObjectId("686d338fc39deb504d02331c"),
      email: "test@yopmail.com",
      password: await bcrypt.hash("Test@123", 10),
      fullName: "Test User",
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await User.findOneAndUpdate({ email: testUser.email }, testUser, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
    console.log("Seeded test user");

    // 2. Seed groups
    const groups = [
      {
        _id: new mongoose.Types.ObjectId("686d41e27ed8842eb85b658b"),
        name: "Commodities",
        createdAt: new Date("2025-07-08T16:05:54.480Z"),
        updatedAt: new Date("2025-07-08T16:05:54.480Z"),
      },
      {
        _id: new mongoose.Types.ObjectId("686d41e97ed8842eb85b658f"),
        name: "Currency",
        createdAt: new Date("2025-07-08T16:06:01.360Z"),
        updatedAt: new Date("2025-07-08T16:06:01.360Z"),
      },
      {
        _id: new mongoose.Types.ObjectId("686d41f57ed8842eb85b6593"),
        name: "Stocks",
        createdAt: new Date("2025-07-08T16:06:13.366Z"),
        updatedAt: new Date("2025-07-08T16:06:13.366Z"),
      },
      {
        _id: new mongoose.Types.ObjectId("686d41fc7ed8842eb85b6597"),
        name: "Crypto",
        createdAt: new Date("2025-07-08T16:06:20.325Z"),
        updatedAt: new Date("2025-07-08T16:06:20.325Z"),
      },
    ];
    for (const group of groups) {
      await Group.findOneAndUpdate({ _id: group._id }, group, {
        upsert: true,
        setDefaultsOnInsert: true,
      });
    }
    console.log("Seeded groups");

    // 3. Seed bots (assign to correct group by name)
    const bots = [
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5479"),
        name: "XAU/USD",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for Apple stock.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Commodities",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5480"),
        name: "XAG/USD",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for Apple stock.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Commodities",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5483"),
        name: "Crude Oil",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for Apple stock.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Commodities",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5481"),
        name: "EUR/USD",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for Apple stock.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Currency",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5482"),
        name: "JPY/USD",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for Apple stock.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Currency",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5484"),
        name: "AUD/USD",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for Apple stock.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Currency",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f381d179df0fd5e5471"),
        name: "Apple",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for Apple stock.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:32.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.296Z"),
        groupName: "Stocks",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f3e1d179df0fd5e5475"),
        name: "Amazon",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for Amazon stock.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:38.984Z"),
        updatedAt: new Date("2025-07-08T16:02:49.314Z"),
        groupName: "Stocks",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f441d179df0fd5e5479"),
        name: "Microsoft",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for Microsoft stock.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:44.821Z"),
        updatedAt: new Date("2025-07-08T16:02:49.331Z"),
        groupName: "Stocks",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f4d1d179df0fd5e547d"),
        name: "BTC/USD",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for BTC/USD.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:53.687Z"),
        updatedAt: new Date("2025-07-08T16:02:49.352Z"),
        groupName: "Crypto",
      },
      {
        _id: new mongoose.Types.ObjectId("686d3f521d179df0fd5e5481"),
        name: "ETH/USD",
        description:
          "An advanced trading bot that analyzes market trends, predicts price movements, and executes trades for ETH/USD.",
        recommendedCapital: 100,
        performanceDuration: "1M",
        script: "USD",
        createdAt: new Date("2025-07-08T15:54:58.700Z"),
        updatedAt: new Date("2025-07-08T16:02:49.371Z"),
        groupName: "Crypto",
      },
    ];

    const seededBots: any[] = [];
    for (const bot of bots) {
      const group = await Group.findOne({ name: bot.groupName });
      if (!group) throw new Error(`Group not found for bot: ${bot.name}`);
      const seededBot = await Bot.findOneAndUpdate(
        { _id: bot._id },
        { ...bot, groupId: group._id },
        { upsert: true, setDefaultsOnInsert: true, new: true }
      );
      seededBots.push(seededBot);
    }
    console.log("Seeded bots");

    // 4. Seed signals for all bots
    const signalsPath = path.join(__dirname, "data", "signals.json");
    const signalsData = JSON.parse(fs.readFileSync(signalsPath, "utf8"));

    console.log(`Loading ${signalsData.length} signals from signals.json`);

    for (const bot of seededBots) {
      console.log(`Seeding signals for bot: ${bot.name} (${bot._id})`);

      for (const signal of signalsData) {
        // Create unique tradeId for each bot by appending bot name
        const uniqueTradeId = `${signal.tradeId}_${bot.name.replace(
          /[^a-zA-Z0-9]/g,
          ""
        )}`;

        const signalData = {
          botId: bot._id,
          tradeId: uniqueTradeId,
          direction: signal.direction,
          signalTime: new Date(signal.signalTime),
          entryTime: new Date(signal.entryTime),
          entryPrice: signal.entryPrice,
          stoploss: signal.stoploss,
          target1r: signal.target1r,
          target2r: signal.target2r,
          exitTime: signal.exitTime ? new Date(signal.exitTime) : undefined,
          exitPrice: signal.exitPrice,
          exitReason: signal.exitReason,
          profitLoss: signal.profitLoss,
          profitLossR: signal.profitLossR,
          trailCount: signal.trailCount,
          createdAt: new Date(signal.createdAt),
          updatedAt: new Date(signal.updatedAt),
        };

        try {
          await Signal.findOneAndUpdate(
            { botId: bot._id, tradeId: uniqueTradeId },
            signalData,
            { upsert: true, setDefaultsOnInsert: true }
          );
        } catch (error) {
          console.warn(
            `Failed to seed signal ${uniqueTradeId} for bot ${bot.name}:`,
            error
          );
        }
      }

      console.log(`Completed seeding signals for bot: ${bot.name}`);
    }

    console.log("Seeded signals for all bots");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
