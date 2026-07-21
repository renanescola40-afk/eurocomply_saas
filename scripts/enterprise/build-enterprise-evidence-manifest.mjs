#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SENSITIVE_KEY = /(secret|token|password|credential|authorization|cookie|connection.?string|private.?key|signed.?url|database.?url)/i;
const MAX_FILES = 500;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

function fail(message) { throw new Error(message); }
function digest(value) { return createHash('sha256').update(value).digest('hex'); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function hasSensitiveShape(value) {
  if (Array.isArray(value)) return value.some(hasSensitiveShape);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => (SENSITIVE_KEY.test(key) && item !== null && item !== '' && item !== false) || hasSensitiveShape(item));
}
function walk(root, current = root, files = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) walk(root, path, files);
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(path);
    if (files.length > MAX_FILES) fail(`Evidence inventory exceeds ${MAX_FILES} JSON files`);
  }
  return files;
}
function normalizeEvidence(document, sourcePath, targetSha) {
  const evidenceItem = String(document.evidenceItem ?? document.schema ?? '').trim();
  const runId = String(document.runId ?? document.githubRunId ?? '').trim();
  const target = String(document.targetSha ?? '').trim();
  const observed = String(document.observedSha ?? '').trim();
  const controlsVerified = Array.isArray(document.controlsVerified)
    ? [...new Set(document.controlsVerified.map(String).map((value) => value.trim()).filter(Boolean))].sort()
    : [];
  const failures = [];
  if (!evidenceItem) failures.push('evidenceItem missing');
  if (target !== targetSha || observed !== targetSha) failures.push('exact-SHA provenance mismatch');
  if (document.status !== 'Complete' || document.outcome !== 'passed') failures.push('evidence is not Complete/passed');
  if (!document.generatedAt || Number.isNaN(Date.parse(document.generatedAt))) failures.push('invalid generatedAt');
  if (!String(document.repository ?? '').trim() || !runId) failures.push('repository/run provenance missing');
  if (controlsVerified.length === 0) failures.push('controlsVerified missing');
  if (document.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('sensitive-value assertion missing');
  if (hasSensitiveShape(document)) failures.push('sensitive key/value shape detected');
  return {
    accepted: failures.length === 0,
    failures,
    item: {
      evidenceItem,
      targetSha: target,
      observedSha: observed,
      status: document.status,
      outcome: document.outcome,
      generatedAt: document.generatedAt,
      repository: document.repository,
      runId,
      controlsVerified,
      evidenceIntegrity: { containsSensitiveValues: false },
      source: { path: sourcePath, sha256: digest(JSON.stringify(stable(document))) },
    },
  };
}

export function buildManifest({ root, targetSha, repository, generatedAt = new Date().toISOString() }) {
  if (!FULL_SHA.test(targetSha)) fail('targetSha must be a full lowercase Git SHA');
  const absoluteRoot = resolve(root);
  const accepted = [];
  const rejected = [];
  for (const path of walk(absoluteRoot)) {
    const sourcePath = relative(process.cwd(), path).replaceAll('\\', '/');
    const size = statSync(path).size;
    if (size > MAX_FILE_BYTES) { rejected.push({ sourcePath, failures: [`file exceeds ${MAX_FILE_BYTES} bytes`] }); continue; }
    let parsed;
    try { parsed = JSON.parse(readFileSync(path, 'utf8')); }
    catch { rejected.push({ sourcePath, failures: ['invalid JSON'] }); continue; }
    const documents = Array.isArray(parsed) ? parsed : [parsed];
    for (const document of documents) {
      const normalized = normalizeEvidence(document, sourcePath, targetSha);
      if (normalized.accepted) accepted.push(normalized.item);
      else rejected.push({ sourcePath, evidenceItem: normalized.item.evidenceItem || 'unknown', failures: normalized.failures });
    }
  }
  accepted.sort((a, b) => `${a.evidenceItem}:${a.source.path}`.localeCompare(`${b.evidenceItem}:${b.source.path}`));
  const duplicateKeys = accepted.map((item) => `${item.evidenceItem}:${item.runId}`);
  if (new Set(duplicateKeys).size !== duplicateKeys.length) fail('Duplicate evidenceItem/runId pairs are forbidden');
  const manifest = {
    schema: 'risck-comply.enterprise-evidence-manifest.v1',
    generatedAt,
    repository,
    targetSha,
    items: accepted,
    rejected,
    summary: {
      acceptedItems: accepted.length,
      rejectedItems: rejected.length,
      controlsReferenced: new Set(accepted.flatMap((item) => item.controlsVerified)).size,
      decision: rejected.length === 0 && accepted.length > 0 ? 'READY_FOR_PROMOTION' : 'NO_GO',
    },
  };
  return { ...manifest, integrity: { sha256: digest(JSON.stringify(stable(manifest))) } };
}

function args(argv) { const out = {}; for (let i = 0; i < argv.length; i += 2) out[argv[i]?.replace(/^--/, '')] = argv[i + 1]; return out; }
function main() {
  const options = args(process.argv.slice(2));
  if (!options.root || !options.sha || !options.output || !options.repository) fail('Required: --root --sha --output --repository');
  const manifest = buildManifest({ root: options.root, targetSha: options.sha, repository: options.repository });
  const output = resolve(options.output);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(manifest.summary));
  if (manifest.summary.decision !== 'READY_FOR_PROMOTION') process.exitCode = 2;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();
