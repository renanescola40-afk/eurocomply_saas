import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const allowedPullRequestTargetWorkflows = new Set([]);
const checkoutCredentialExceptions = new Set([
  '.github/workflows/p0-commit-lockfile.yml',
]);
const failures = [];
const warnings = [];

function workflowFiles() {
  if (!existsSync(workflowDir)) return [];
  return readdirSync(workflowDir)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => join(workflowDir, name));
}

function hasExplicitPermissions(source) {
  return /^\s*permissions:\s*(?:$|\{[^}]*\}\s*$)/m.test(source);
}

function usesWriteAll(source) {
  return /^permissions:\s*write-all\s*$/m.test(source) || /\n\s+permissions:\s*write-all\s*$/m.test(source);
}

function usesPullRequestTarget(source) {
  return /^\s*pull_request_target\s*:/m.test(source) || /^\s*-\s*pull_request_target\s*$/m.test(source);
}

function hasCheckoutPersistCredentialsFalse(source) {
  if (!source.includes('actions/checkout@')) return true;
  return source.includes('persist-credentials: false');
}

function hasJustifiedCheckoutWriteException(file, source) {
  if (!checkoutCredentialExceptions.has(file)) return false;
  return source.includes('contents: write') && source.includes('git push');
}

for (const file of workflowFiles()) {
  const source = readFileSync(file, 'utf8');

  if (!hasExplicitPermissions(source)) {
    failures.push(`${file}: missing explicit top-level or job-level permissions block`);
  }

  if (usesWriteAll(source)) {
    failures.push(`${file}: permissions write-all is forbidden`);
  }

  if (usesPullRequestTarget(source) && !allowedPullRequestTargetWorkflows.has(file)) {
    failures.push(`${file}: pull_request_target is forbidden unless explicitly allowlisted`);
  }

  if (!hasCheckoutPersistCredentialsFalse(source)) {
    if (hasJustifiedCheckoutWriteException(file, source)) {
      warnings.push(`${file}: checkout credentials are persisted only because this workflow commits/pushes a lockfile.`);
    } else {
      failures.push(`${file}: actions/checkout must set persist-credentials: false when the workflow does not push back to the repository`);
    }
  }
}

console.log('EuroComply workflow permissions policy check');
console.log('---------------------------------------------');
console.log(`Scanned ${workflowFiles().length} workflow files.`);
for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (failures.length > 0) {
  console.error('Workflow permissions failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Workflow permissions policy: ok');
}
