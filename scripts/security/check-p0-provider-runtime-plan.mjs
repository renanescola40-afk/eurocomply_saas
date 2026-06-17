#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const planPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'templates', 'provider-runtime-plan.template.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredProviders = new Set(['github', 'vercel', 'supabase']);

function fail(message) {
  console.error(`Provider runtime plan check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(planPath)) {
  fail(`missing plan file: ${planPath}`);
}

let plan;
try {
  plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${planPath}: ${error.message}`);
}

if (planPath.includes('/runtime/') && placeholderPattern.test(JSON.stringify(plan))) {
  fail('runtime plan must not contain placeholders');
}

if (plan.planId !== 'provider-runtime-evidence-plan') {
  fail('planId must be provider-runtime-evidence-plan');
}

if (!Array.isArray(plan.redactionRules) || plan.redactionRules.length < 3) {
  fail('redactionRules must include repository-safe handling rules');
}

if (!Array.isArray(plan.requiredProviders) || plan.requiredProviders.length < requiredProviders.size) {
  fail('requiredProviders must include GitHub, Vercel, and Supabase');
}

const providersByName = new Map(plan.requiredProviders.map((entry) => [String(entry.provider || '').toLowerCase(), entry]));

for (const provider of requiredProviders) {
  const entry = providersByName.get(provider);
  if (!entry) fail(`missing required provider ${provider}`);
  if (!entry.environment || !entry.status || !Array.isArray(entry.expectedEvidence) || entry.expectedEvidence.length === 0) {
    fail(`${provider} must include environment, status, and expectedEvidence`);
  }
  if (entry.status !== 'planned' && entry.status !== 'reviewed') {
    fail(`${provider} status must be planned or reviewed`);
  }
}

if (!Array.isArray(plan.optionalProviders)) {
  fail('optionalProviders must be an array');
}

for (const entry of plan.optionalProviders) {
  if (!entry.provider || !entry.environment || !entry.status || !entry.rationale) {
    fail('each optional provider must include provider, environment, status, and rationale');
  }
}

if (plan.evidenceOutputTarget !== 'docs/security/evidence/runtime/production-secrets-provider-stores.json') {
  fail('evidenceOutputTarget must point to the provider runtime evidence JSON');
}

console.log(`Provider runtime evidence plan is valid: ${planPath}`);
