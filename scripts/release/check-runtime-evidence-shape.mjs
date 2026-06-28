#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const filePath = process.argv[2];
const requiredKey = process.argv[3];

if (!filePath || !requiredKey) {
  console.error('Usage: node scripts/release/check-runtime-evidence-shape.mjs <json-file> <required-key>');
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.error(`${filePath} is missing.`);
  process.exit(1);
}

const parsed = JSON.parse(readFileSync(filePath, 'utf8'));

if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  console.error(`${filePath} must contain a JSON object.`);
  process.exit(1);
}

if (!Object.hasOwn(parsed, requiredKey)) {
  console.error(`${filePath} is missing required key: ${requiredKey}`);
  process.exit(1);
}

console.log(`${filePath} contains required key: ${requiredKey}`);
