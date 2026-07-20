#!/usr/bin/env node
import fs from 'node:fs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) throw new Error('evidence_file_required');
const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = String(evidence.commitSha ?? '');
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('invalid_commit_sha');
if (evidence.schemaVersion !== 1) throw new Error('unsupported_schema_version');
for (const key of ['migrationApplied','rlsForced','immutableVersions','independentApproval','integrityValidated','exportLifecycleValidated','retentionValidated']) {
  if (evidence.controls?.[key] !== true) throw new Error(`control_failed:${key}`);
}
const serialized = JSON.stringify(evidence);
for (const forbidden of ['databaseUrl','authorization','cookie','token','customerName','documentContent','storageSignedUrl']) {
  if (serialized.toLowerCase().includes(forbidden.toLowerCase())) throw new Error(`forbidden_field:${forbidden}`);
}
console.log('Enterprise documents evidence accepted');