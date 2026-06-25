#!/usr/bin/env node

const requiredVariables = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
];

const optionalRoutingVariables = [
  'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
  'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL',
];

const missingRequired = requiredVariables.filter((name) => !process.env[name]);
const missingRouting = optionalRoutingVariables.filter((name) => !process.env[name]);

if (missingRequired.length > 0) {
  console.error('Clerk is not ready. Missing required environment variables:');
  for (const name of missingRequired) {
    console.error(`- ${name}`);
  }
  console.error('\nRotate any previously exposed Clerk backend secret before setting these values.');
  process.exit(1);
}

if (missingRouting.length > 0) {
  console.warn('Clerk routing variables are not fully configured:');
  for (const name of missingRouting) {
    console.warn(`- ${name}`);
  }
  console.warn('\nDefault Clerk routing may be used until these values are set.');
}

console.log('Clerk environment variables look ready.');
