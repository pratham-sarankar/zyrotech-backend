#!/usr/bin/env node

/**
 * Migration Runner Script
 *
 * Usage:
 *   node scripts/migrate.js                    # Run all migrations
 *   node scripts/migrate.js 002                # Run specific migration
 *   node scripts/migrate.js rollback           # Rollback all migrations
 *   node scripts/migrate.js 002 rollback       # Rollback specific migration
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const command = process.argv[2] || "migrate";
const migrationNumber = process.argv[3];

// Get all migration files
const migrationsDir = path.join(__dirname, "..", "src", "migrations");
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".ts"))
  .sort();

if (migrationNumber) {
  // Run specific migration
  const targetFile = migrationFiles.find((file) =>
    file.startsWith(migrationNumber)
  );
  if (!targetFile) {
    console.error(
      `Migration ${migrationNumber} not found. Available migrations:`,
      migrationFiles.map((f) => f.split("-")[0])
    );
    process.exit(1);
  }

  const migrationFile = path.join(migrationsDir, targetFile);
  console.log(`Running migration: ${targetFile}`);

  const child = spawn("npx", ["ts-node", migrationFile, command], {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });

  child.on("close", (code) => {
    process.exit(code);
  });

  child.on("error", (error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
} else {
  // Run all migrations
  console.log("Running all migrations...");

  const runMigration = (index) => {
    if (index >= migrationFiles.length) {
      console.log("All migrations completed!");
      process.exit(0);
    }

    const migrationFile = path.join(migrationsDir, migrationFiles[index]);
    console.log(`Running migration: ${migrationFiles[index]}`);

    const child = spawn("npx", ["ts-node", migrationFile, command], {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });

    child.on("close", (code) => {
      if (code === 0) {
        runMigration(index + 1);
      } else {
        console.error(
          `Migration ${migrationFiles[index]} failed with code ${code}`
        );
        process.exit(code);
      }
    });

    child.on("error", (error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
  };

  runMigration(0);
}
