#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_CHECKS = ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore'];
const SHA_RE = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const CHECKSUM_RE = /^[a-f0-9]{64}$/i;

function requireString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function parseDate(value, name) {
  const parsed = Date.parse(requireString(value, name));
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be an ISO timestamp`);
  return parsed;
}

export function validateRestoreManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('manifest must be an object');
  if (manifest.schemaVersion !== 1) throw new Error('schemaVersion must be 1');

  const executionId = requireString(manifest.executionId, 'executionId');
  const commitSha = requireString(manifest.commitSha, 'commitSha');
  if (!SHA_RE.test(commitSha)) throw new Error('commitSha must be a full 40 or 64 character hex digest');

  if (manifest.sourceEnvironment !== 'production') throw new Error('sourceEnvironment must be production');
  if (manifest.targetEnvironment !== 'recovery-isolated') throw new Error('targetEnvironment must be recovery-isolated');

  const sourceProjectRef = requireString(manifest.sourceProjectRef, 'sourceProjectRef');
  const targetProjectRef = requireString(manifest.targetProjectRef, 'targetProjectRef');
  if (sourceProjectRef === targetProjectRef) throw new Error('sourceProjectRef and targetProjectRef must differ');

  const executedAt = parseDate(manifest.executedAt, 'executedAt');
  const backupCreatedAt = parseDate(manifest.backup?.createdAt, 'backup.createdAt');
  const backupCompletedAt = parseDate(manifest.backup?.completedAt, 'backup.completedAt');
  const restoreStartedAt = parseDate(manifest.restore?.startedAt, 'restore.startedAt');
  const restoreCompletedAt = parseDate(manifest.restore?.completedAt, 'restore.completedAt');

  if (backupCompletedAt < backupCreatedAt) throw new Error('backup completion precedes creation');
  if (restoreCompletedAt < restoreStartedAt) throw new Error('restore completion precedes start');
  if (restoreStartedAt < backupCompletedAt) throw new Error('restore started before backup completed');
  if (executedAt < restoreCompletedAt) throw new Error('executedAt precedes restore completion');

  if (manifest.backup?.encrypted !== true) throw new Error('backup.encrypted must be true');
  if (!CHECKSUM_RE.test(requireString(manifest.backup?.checksumSha256, 'backup.checksumSha256'))) {
    throw new Error('backup.checksumSha256 must be a 64 character hex digest');
  }
  requireString(manifest.backup?.id, 'backup.id');
  requireString(manifest.backup?.provider, 'backup.provider');
  if (manifest.restore?.status !== 'completed') throw new Error('restore.status must be completed');

  const checks = new Map((Array.isArray(manifest.checks) ? manifest.checks : []).map((check) => [check?.name, check]));
  for (const name of REQUIRED_CHECKS) {
    const check = checks.get(name);
    if (!check || check.passed !== true) throw new Error(`required check ${name} must pass`);
    requireString(check.evidence, `checks.${name}.evidence`);
  }

  const rpoSeconds = manifest.metrics?.rpoSeconds;
  const rtoSeconds = manifest.metrics?.rtoSeconds;
  if (!Number.isFinite(rpoSeconds) || rpoSeconds < 0) throw new Error('metrics.rpoSeconds must be measured and non-negative');
  if (!Number.isFinite(rtoSeconds) || rtoSeconds <= 0) throw new Error('metrics.rtoSeconds must be measured and positive');
  if (manifest.metrics?.measured !== true) throw new Error('metrics.measured must be true');

  const approvedBy = requireString(manifest.approval?.approvedBy, 'approval.approvedBy');
  const approvedAt = parseDate(manifest.approval?.approvedAt, 'approval.approvedAt');
  if (approvedAt < restoreCompletedAt) throw new Error('approval predates restore completion');
  if (manifest.approval?.outcome !== 'passed') throw new Error('approval.outcome must be passed');

  return {
    schemaVersion: 1,
    controlId: 'P1-07',
    title: 'Backup and isolated restore tested',
    status: 'Complete',
    generatedFromRealEvidence: true,
    productionValidated: false,
    environment: 'recovery-isolated',
    targetEnvironment: 'recovery-isolated',
    executionId,
    commitSha,
    executedAt: new Date(executedAt).toISOString(),
    sourceProjectRef,
    targetProjectRef,
    reviewer: approvedBy,
    reviewedAt: new Date(approvedAt).toISOString(),
    checks: REQUIRED_CHECKS.map((name) => ({ name, status: 'passed', evidence: checks.get(name).evidence })),
    metrics: { measured: true, rpoSeconds, rtoSeconds },
    backup: { id: manifest.backup.id, provider: manifest.backup.provider, encrypted: true, checksumSha256: manifest.backup.checksumSha256 },
  };
}

function parseArgs(argv) {
  const args = { manifest: null, output: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--manifest') args.manifest = argv[++i];
    else if (argv[i] === '--output') args.output = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!args.manifest) throw new Error('--manifest is required');
  return args;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8'));
    const evidence = validateRestoreManifest(manifest);
    const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
    if (args.output) {
      fs.mkdirSync(path.dirname(args.output), { recursive: true });
      fs.writeFileSync(args.output, serialized, { flag: 'wx' });
    } else {
      process.stdout.write(serialized);
    }
  } catch (error) {
    console.error(`[restore-evidence] ${error instanceof Error ? error.message : 'validation_failed'}`);
    process.exitCode = 1;
  }
}
