#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseEvidenceJson, validatePassingEvidence } from './run-supabase-live-tenant-isolation.mjs';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');

function fail(message) {
  console.error(`P0 Supabase RLS evidence check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(evidencePath)) {
  fail(`${evidencePath} is missing. Enterprise release is blocked until live Complete/passed evidence exists.`);
}

const parsed = parseEvidenceJson(fs.readFileSync(evidencePath, 'utf8'));
if (parsed.errors.length > 0) fail(parsed.errors.join('; '));

const result = validatePassingEvidence(parsed.evidence);
if (!result.valid) fail(result.errors.join('; '));

console.log('P0 Supabase live RLS evidence is Complete/passed and machine-validated.');
