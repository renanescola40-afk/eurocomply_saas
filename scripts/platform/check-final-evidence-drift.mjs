import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const input = resolve(process.env.PLATFORM_FINAL_EVIDENCE_PATH || 'artifacts/platform-final-release-evidence.json');
const output = resolve(process.env.PLATFORM_DRIFT_REPORT_PATH || 'artifacts/platform-evidence-drift.json');
const warnHours = Number(process.env.PLATFORM_EVIDENCE_WARN_HOURS || 72);
const now = Date.now();
const failures = [];
const warnings = [];
let evidence;

try {
  evidence = JSON.parse(readFileSync(input, 'utf8'));
} catch {
  failures.push('Final platform release evidence is missing or malformed');
}

if (evidence) {
  if (evidence.decision !== 'PLATFORM_RELEASE_EVIDENCE_COMPLETE') failures.push('Final platform decision is not complete');
  if (!/^[a-f0-9]{40}$/.test(evidence.release_sha || '')) failures.push('Final platform evidence is not bound to an exact SHA');
  const expiresAt = Date.parse(evidence.expires_at || '');
  if (!Number.isFinite(expiresAt)) failures.push('Evidence expiry is missing or invalid');
  else {
    const remainingHours = (expiresAt - now) / 3_600_000;
    if (remainingHours <= 0) failures.push('Final platform evidence has expired');
    else if (remainingHours <= warnHours) warnings.push(`Final platform evidence expires in ${Math.floor(remainingHours)} hours`);
  }
  const lanes = Array.isArray(evidence.lanes) ? evidence.lanes : [];
  for (const lane of lanes) {
    if (lane.status !== 'PASS') failures.push(`Lane ${lane.name || 'unknown'} is not PASS`);
    if (lane.release_sha && lane.release_sha !== evidence.release_sha) failures.push(`Lane ${lane.name || 'unknown'} SHA drift detected`);
  }
}

const report = {
  schema_version: 1,
  evidence_type: 'platform-evidence-drift',
  checked_at: new Date().toISOString(),
  release_sha: evidence?.release_sha || null,
  status: failures.length ? 'NO_GO' : warnings.length ? 'WARN' : 'PASS',
  failures,
  warnings,
  secret_values_included: false,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Platform evidence drift: ${report.status}`);
if (failures.length) process.exitCode = 1;
