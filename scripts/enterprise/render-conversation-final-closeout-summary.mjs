#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FULL_SHA = /^[0-9a-f]{40}$/;
const DEFAULT_ROOT = 'artifacts/enterprise-conversation-closeout';

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function inline(value) {
  return String(value ?? 'unknown')
    .replace(/[\r\n`]/g, '_')
    .slice(0, 160);
}

export function renderConversationFinalCloseoutSummary({ root = DEFAULT_ROOT, releaseSha } = {}) {
  const normalizedSha = String(releaseSha || '').trim().toLowerCase();
  if (!FULL_SHA.test(normalizedSha)) throw new Error('release_sha_invalid');

  const result = readJson(join(root, 'result.json'));
  const manifest = readJson(join(root, 'retrieval-manifest.json'));
  const lines = ['## Enterprise conversation final closeout', ''];
  lines.push(`- Release SHA: \`${normalizedSha}\``);
  lines.push(`- Retrieval: \`${inline(manifest?.status || 'Unavailable')}\``);
  lines.push(`- Decision: \`${inline(result?.decision || 'ASSESSMENT_UNAVAILABLE')}\``);
  lines.push(`- Completion: \`${inline(result?.completionPercentage ?? 'unknown')}%\``);
  lines.push('');

  const blockers = Array.isArray(result?.blockers) ? result.blockers : [];
  if (blockers.length === 0 && result?.status === 'Complete') {
    lines.push('All canonical exact-SHA evidence passed. The conversation can be closed.');
  } else {
    lines.push('### Blocking evidence');
    if (blockers.length === 0) lines.push('- Assessor result was not produced.');
    for (const blocker of blockers.slice(0, 20)) {
      const failures = Array.isArray(blocker?.failures) ? blocker.failures.slice(0, 20) : [];
      lines.push(`- \`${inline(blocker?.control)}\`: ${failures.map((failure) => `\`${inline(failure)}\``).join(', ') || '`unknown_failure`'}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function runCli() {
  const releaseSha = process.env.RELEASE_SHA || process.argv[2] || '';
  process.stdout.write(renderConversationFinalCloseoutSummary({ releaseSha }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
