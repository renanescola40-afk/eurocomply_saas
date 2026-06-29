#!/usr/bin/env node

const [valueName, value] = process.argv.slice(2);

if (!valueName || !value) {
  console.error('Usage: node scripts/release/check-http-url.mjs <name> <url>');
  process.exit(1);
}

try {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('unsupported protocol');
  }
} catch {
  console.error(`${valueName} must be a valid HTTP(S) URL.`);
  process.exit(1);
}

console.log(`${valueName} is a valid HTTP(S) URL.`);
