#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const [filePath, fieldName, expectedValue] = process.argv.slice(2);

if (!filePath || !fieldName || expectedValue === undefined) {
  console.error('Usage: node scripts/release/check-json-field.mjs <json-file> <field> <expected-value>');
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.error(`${filePath} is missing.`);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(filePath, 'utf8'));
} catch (error) {
  console.error(`${filePath} is not valid JSON: ${error.message}`);
  process.exit(1);
}

if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  console.error(`${filePath} must contain a JSON object.`);
  process.exit(1);
}

const actualValue = parsed[fieldName];

if (String(actualValue) !== expectedValue) {
  console.error(`${filePath} field ${fieldName} must equal ${expectedValue}. Current value: ${actualValue === undefined ? 'missing' : String(actualValue)}`);
  process.exit(1);
}

console.log(`${filePath} field ${fieldName} equals ${expectedValue}.`);
