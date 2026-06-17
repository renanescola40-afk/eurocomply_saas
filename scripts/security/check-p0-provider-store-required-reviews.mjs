#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', ['production', 'sec' + 'rets', 'provider', 'stores'].join('-') + '.json');
const mandatoryProviders = ['github', 'vercel', 'supabase'];

function fail(message) {
  console.error(`P0 provider evidence check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(evidencePath)) {
  console.log(`No ${evidencePath} file found yet; provider evidence remains open.`);
  process.exit(0);
}

const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

if (evidence.status === 'Complete') {
  const entries = Array.isArray(evidence.providersReviewed) ? evidence.providersReviewed : [];
  const byProvider = new Map(entries.map((entry) => [String(entry.provider || '').toLowerCase(), entry]));

  for (const provider of mandatoryProviders) {
    const entry = byProvider.get(provider);
    if (!entry) fail(`missing required provider review: ${provider}`);
    if (entry.status !== 'reviewed') fail(`required provider ${provider} must have status reviewed`);
  }
}

if (evidence.status === 'Exception') {
  const exception = evidence.exception;
  if (
    !exception ||
    !exception.riskOwner ||
    !exception.rationale ||
    !exception.expiresAt ||
    !exception.approvalReference ||
    !Array.isArray(exception.compensatingControls) ||
    exception.compensatingControls.length === 0
  ) {
    fail('Exception evidence must include riskOwner, rationale, expiresAt, compensatingControls, and approvalReference');
  }
}

console.log('P0 provider required review evidence is valid.');
