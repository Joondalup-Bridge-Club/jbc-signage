#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(__dirname, "source", "club-data.json");
const outputDir = path.join(root, "data");
const collections = ["results", "masterpoints", "slams", "events"];

function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`Source data file not found: ${sourcePath}`);
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  fs.mkdirSync(outputDir, { recursive: true });
  for (const name of collections) {
    if (!Array.isArray(source[name])) throw new Error(`Expected "${name}" to be an array in ${sourcePath}`);
    const output = { updated: new Date().toISOString().slice(0, 10), items: source[name] };
    const destination = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`);
    process.stdout.write(`Generated ${path.relative(root, destination)} (${source[name].length} records)\n`);
  }
}

try {
  main();
} catch (error) {
  console.error(`Data generation failed: ${error.message}`);
  process.exitCode = 1;
}
