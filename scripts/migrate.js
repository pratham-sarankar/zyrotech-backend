#!/usr/bin/env node

/**
 * Migration Runner Script
 *
 * Usage:
 *   node scripts/migrate.js                    # Run all migrations
 *   node scripts/migrate.js rollback          # Rollback migrations
 */

const { spawn } = require("child_process");
const path = require("path");

const command = process.argv[2] || "migrate";

// Run the TypeScript migration file
const migrationFile = path.join(
  __dirname,
  "..",
  "src",
  "migrations",
  "001-add-bot-fields.ts"
);

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
