#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const files = [
  '.github/workflows/public-production-final.yml',
  '.github/workflows/enterprise-production-gate.yml',
  'scripts/release/check-public-production-release-env.mjs',
  'scripts/release/check-enterprise-release-env.mjs',
];

const canonical = [
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_ESSENTIAL_ANNUAL',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
];

const legacyReadiness = [
  'STRIPE_PRICE_STARTER_MONTHLY',
  'STRIPE_PRICE_GROWTH_MONTHLY',
  'STRIPE_PRICE_ENTERPRISE_MONTHLY',
];

for (const path of files) {
  const source = readFileSync(path, 'utf8');
  for (const name of canonical) {
    if (!source.includes(name)) {
      throw new Error(`${path} is missing canonical release binding ${name}`);
    }
  }
  for (const name of legacyReadiness) {
    if (source.includes(name)) {
      throw new Error(`${path} still treats legacy release binding ${name} as final release authority`);
    }
  }
}

console.log('Canonical Stripe final-release binding contract: PASS');
