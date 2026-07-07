import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const branchProtectionEvidencePath = 'docs/security/evidence/runtime/branch-protection-required-checks.json';
const ciValidationEvidencePath = 'docs/security/evidence/runtime/ci-required-checks-validation.json';
const policyPath = 'docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md';
const writeMode = process.argv.includes('--write');

const failures = [];
const warnings = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function readJson(path) {
  const source = read(path);
  if (!source) return null;

  try {
    return JSON.parse(source);
  } catch (error) {
    failures.push(`${path} is not valid JSON: ${error.message}`);
    return null;
  }
}

function stripYamlScalar(value = '') {
  return value
    .trim()
    .replace(/^['"]/, '')
    .replace(/['"]$/, '')
    .replace(/\s+#.*$/, '')
    .trim();
}

function workflowFiles() {
  if (!existsSync(workflowDir)) return [];

  return readdirSync(workflowDir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => join(workflowDir, name));
}

function workflowName(source, file) {
  const match = source.match(/^name:\s*(.+?)\s*$/m);
  return match ? stripYamlScalar(match[1]) : file.replace(/^\.github\/workflows\//, '').replace(/\.ya?ml$/i, '');
}

function hasPullRequestTrigger(source) {
  return /^\s*pull_request\s*:/m.test(source) || /^\s*-\s*pull_request\s*$/m.test(source);
}

function hasPullRequestTargetTrigger(source) {
  return /^\s*pull_request_target\s*:/m.test(source) || /^\s*-\s*pull_request_target\s*$/m.test(source);
}

function jobNames(source) {
  const names = [];
  let inJobs = false;
  let currentJob = null;

  for (const line of source.split('\n')) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }

    if (!inJobs) continue;

    if (/^[^\s#][^:]*:\s*$/.test(line)) {
      break;
    }

    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*(?:#.*)?$/);
    if (jobMatch) {
      currentJob = { id: jobMatch[1], name: jobMatch[1] };
      names.push(currentJob);
      continue;
    }

    const nameMatch = line.match(/^    name:\s*(.+?)\s*$/);
    if (currentJob && nameMatch) {
      currentJob.name = stripYamlScalar(nameMatch[1]);
    }
  }

  return names;
}

function actionUses(source, file) {
  return source
    .split('\n')
    .map((line, index) => ({ line: index + 1, match: line.match(/uses:\s*([^\s#]+)(?:\s+#.*)?$/) }))
    .filter(({ match }) => Boolean(match))
    .map(({ line, match }) => ({ file, line, value: stripYamlScalar(match[1]) }))
    .filter(({ value }) => !value.startsWith('./') && !value.startsWith('docker://'));
}

function actionRef(value) {
  const at = value.lastIndexOf('@');
  if (at === -1) return '';
  return value.slice(at + 1);
}

function isPinnedSha(ref) {
  return /^[a-f0-9]{40}$/i.test(ref) || /^[a-f0-9]{64}$/i.test(ref);
}

const branchProtectionEvidence = readJson(branchProtectionEvidencePath) ?? {};
const policySource = read(policyPath);
const requiredChecks = [...new Set(branchProtectionEvidence.required_status_checks ?? [])];
const discoveredChecks = new Map();
const workflowTriggerByName = new Map();
const pullRequestTargetWorkflows = [];
const unpinnedActions = [];

if (requiredChecks.length === 0) {
  failures.push(`${branchProtectionEvidencePath} must contain a non-empty required_status_checks array`);
}

for (const file of workflowFiles()) {
  const source = readFileSync(file, 'utf8');
  const name = workflowName(source, file);
  const hasPr = hasPullRequestTrigger(source);

  workflowTriggerByName.set(name, hasPr);

  if (hasPullRequestTargetTrigger(source)) {
    pullRequestTargetWorkflows.push(file);
  }

  for (const job of jobNames(source)) {
    discoveredChecks.set(`${name} / ${job.name}`, { workflow: name, job: job.name, file, pull_request: hasPr });
  }

  for (const action of actionUses(source, file)) {
    const ref = actionRef(action.value);
    if (!ref || !isPinnedSha(ref)) {
      unpinnedActions.push({ ...action, ref: ref || null, risk: 'version-tag-or-floating-action-reference' });
    }
  }
}

const missingRequiredChecks = requiredChecks.filter((check) => !discoveredChecks.has(check));
const requiredChecksWithoutPullRequestTrigger = requiredChecks.filter((check) => {
  const discovered = discoveredChecks.get(check);
  return discovered && discovered.pull_request !== true;
});

for (const check of requiredChecks) {
  const checkName = check.split(' / ').pop();
  if (policySource && !policySource.includes(checkName)) {
    failures.push(`${policyPath} missing required check name: ${checkName}`);
  }
}

if (missingRequiredChecks.length > 0) {
  failures.push(`required checks are missing real workflow jobs: ${missingRequiredChecks.join(', ')}`);
}

if (requiredChecksWithoutPullRequestTrigger.length > 0) {
  failures.push(`required checks do not run on pull_request: ${requiredChecksWithoutPullRequestTrigger.join(', ')}`);
}

if (pullRequestTargetWorkflows.length > 0) {
  failures.push(`pull_request_target is forbidden for this repository: ${pullRequestTargetWorkflows.join(', ')}`);
}

if (unpinnedActions.length > 0) {
  warnings.push(`${unpinnedActions.length} action references use version tags instead of immutable SHAs. This is tracked as supply-chain risk until each action is pinned to a reviewed commit SHA.`);
}

const report = {
  schema_version: 1,
  evidence_type: 'ci-required-checks-validation',
  repository: 'renanescola40-afk/eurocomply_saas',
  branch: 'main',
  generated_at: new Date().toISOString(),
  status: failures.length === 0 ? 'Complete' : 'Blocked',
  source: 'repo-side-required-check-validation',
  policy_document: policyPath,
  branch_protection_ui_verified: false,
  branch_protection_ui_note: 'This report validates that required check names map to real workflow/job names in the repository. GitHub ruleset or branch protection UI configuration must still be verified by an administrator.',
  required_status_checks: requiredChecks,
  missing_required_checks: missingRequiredChecks,
  required_checks_without_pull_request_trigger: requiredChecksWithoutPullRequestTrigger,
  pull_request_target_workflows: pullRequestTargetWorkflows,
  discovered_required_checks: requiredChecks
    .filter((check) => discoveredChecks.has(check))
    .map((check) => ({ check, ...discoveredChecks.get(check) })),
  supply_chain_risks: {
    unpinned_action_references: unpinnedActions,
    action_pin_target: 'Replace version tags with reviewed full-length commit SHAs when each action owner/ref is triaged.',
  },
};

if (writeMode) {
  writeFileSync(ciValidationEvidencePath, `${JSON.stringify(report, null, 2)}\n`);
}

const existingReport = readJson(ciValidationEvidencePath);
if (existingReport) {
  const fieldsToCompare = [
    'status',
    'required_status_checks',
    'missing_required_checks',
    'required_checks_without_pull_request_trigger',
    'pull_request_target_workflows',
  ];

  for (const field of fieldsToCompare) {
    if (JSON.stringify(existingReport[field]) !== JSON.stringify(report[field])) {
      failures.push(`${ciValidationEvidencePath} is stale for field ${field}; run node scripts/security/check-ci-required-checks-validation.mjs --write and commit the updated evidence`);
    }
  }
}

console.log('RISCK COMPLY CI required-check validation');
console.log('-----------------------------------------');
console.log(`Required checks: ${requiredChecks.length}`);
console.log(`Matched required checks: ${requiredChecks.length - missingRequiredChecks.length}`);
console.log(`pull_request_target workflows: ${pullRequestTargetWorkflows.length}`);
for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (failures.length > 0) {
  console.error('CI required-check validation failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('CI required-check validation: ok');
}
