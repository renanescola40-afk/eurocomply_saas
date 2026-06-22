#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const pairs = [
  {
    template: 'docs/security/evidence/templates/production-secrets-provider-stores.template.json',
    output: 'docs/security/evidence/runtime/production-secrets-provider-stores.json',
  },
  {
    template: 'docs/security/evidence/templates/supabase-live-rls-validation.template.json',
    output: 'docs/security/evidence/runtime/supabase-live-rls-validation.json',
  },
  {
    template: 'docs/security/evidence/templates/external-security-review-or-pentest.template.json',
    output: 'docs/security/evidence/runtime/external-security-review-or-pentest.json',
  },
];

function fail(message) {
  console.error(`P0 runtime evidence stub generation failed: ${message}`);
  process.exit(1);
}

for (const pair of pairs) {
  if (!fs.existsSync(pair.template)) {
    fail(`missing template: ${pair.template}`);
  }
}

for (const pair of pairs) {
  if (fs.existsSync(pair.output)) {
    console.log(`skip existing runtime evidence file: ${pair.output}`);
    continue;
  }

  fs.mkdirSync(path.dirname(pair.output), { recursive: true });
  fs.copyFileSync(pair.template, pair.output);
  console.log(`created runtime evidence stub: ${pair.output}`);
}

console.log('P0 runtime evidence stubs initialized. Replace placeholders with reviewed redacted evidence before committing runtime files.');
