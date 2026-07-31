#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [directory, releaseSha, workflowRunId, workflowUrl] = process.argv.slice(2);
if (!directory || !/^[0-9a-f]{40}$/i.test(releaseSha ?? '') || !workflowRunId || !workflowUrl) {
  throw new Error('usage: directory release-sha workflow-run-id workflow-url');
}

const allowed = new Set([
  'deployment-smoke-validation.json',
  'rollback-dry-run-validation.json',
  'production-final-validation.json',
  'supabase-live-rls-validation.json',
  'authenticated-production-smoke.json',
  'observability-production-validation.json',
]);

for (const filename of await readdir(directory)) {
  if (!allowed.has(filename)) continue;
  const filePath = path.join(directory, filename);
  const document = JSON.parse(await readFile(filePath, 'utf8'));
  const existingSha = document.releaseSha ?? document.commitSha ?? document.sha ?? document.provenance?.commitSha;
  if (existingSha && existingSha !== releaseSha) throw new Error(`${filename}: existing SHA does not match release SHA`);
  document.releaseSha = releaseSha;
  document.provenance = {
    ...(document.provenance ?? {}),
    provider: 'github-actions',
    workflowRunId,
    workflowUrl,
    commitSha: releaseSha,
    stampedAt: new Date().toISOString(),
  };
  await writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`);
}
