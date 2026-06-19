#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');
const requiredEnv = ['GITHUB_SERVER_URL', 'GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'GITHUB_SHA'];
const missing = requiredEnv.filter((name) => !process.env[name]);

function fail(message) {
  console.error(`Supabase live RLS provenance stamp failed: ${message}`);
  process.exit(1);
}

if (missing.length > 0) {
  fail(`missing GitHub Actions metadata: ${missing.join(', ')}`);
}

if (!fs.existsSync(evidencePath)) {
  fail(`${evidencePath} does not exist`);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON: ${error instanceof Error ? error.message : error}`);
}

if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') {
  fail('provenance can only be stamped on passing Complete evidence');
}

const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
evidence.githubActions = {
  generatedInGitHubActions: true,
  workflow: process.env.GITHUB_WORKFLOW ?? null,
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  runUrl,
  repository: process.env.GITHUB_REPOSITORY,
  commitSha: process.env.GITHUB_SHA,
  refName: process.env.GITHUB_REF_NAME ?? null,
  actor: process.env.GITHUB_ACTOR ?? null,
  eventName: process.env.GITHUB_EVENT_NAME ?? null,
  stampedAt: new Date().toISOString(),
};

fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Stamped Supabase live RLS evidence provenance: ${runUrl}`);
