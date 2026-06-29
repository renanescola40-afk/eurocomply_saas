#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const [filePath, ...requiredTexts] = process.argv.slice(2);

if (!filePath || requiredTexts.length === 0) {
  console.error('Usage: node scripts/security/check-text-includes.mjs <file> <required-text>...');
  process.exit(1);
}

const content = readFileSync(filePath, 'utf8');
const missing = requiredTexts.filter((text) => !content.includes(text));

if (missing.length > 0) {
  console.error(`${filePath} is missing required text:`);
  for (const text of missing) console.error(`- ${text}`);
  process.exit(1);
}

console.log(`${filePath}: required text is present.`);
