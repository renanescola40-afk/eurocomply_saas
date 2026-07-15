import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const allowedPullRequestTargetWorkflows = new Set([
  '.github/workflows/pr-autopilot.yml',
]);
const failures = [];

const forbiddenPatterns = [
  { name: 'curl piped to shell', pattern: /curl\s+[^\n|]+\|\s*(bash|sh)/i },
  { name: 'wget piped to shell', pattern: /wget\s+[^\n|]+\|\s*(bash|sh)/i },
  { name: 'remote shell execution', pattern: /(bash|sh)\s+-c\s+['"]?\$\(curl/i },
  { name: 'continue-on-error in workflow', pattern: /continue-on-error\s*:\s*true/i },
  { name: 'latest floating container tag', pattern: /image\s*:\s*[^\n:@]+:latest\s*$/im },
];

const forbiddenPullRequestTargetPatterns = [
  { name: 'repository contents write', pattern: /contents:\s*write/i },
  { name: 'pull request write', pattern: /pull-requests:\s*write/i },
  { name: 'branch synchronization API', pattern: /pulls\.updateBranch/i },
  { name: 'pull request merge API', pattern: /pulls\.merge/i },
  { name: 'auto-merge API', pattern: /enablePullRequestAutoMerge/i },
  { name: 'dedicated push or merge token', pattern: /PR_(?:AUTOPILOT|AUTOFIX)_TOKEN/i },
];

function workflowFiles() {
  if (!existsSync(workflowDir)) return [];
  return readdirSync(workflowDir)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => join(workflowDir, name));
}

function usesPullRequestTarget(source) {
  return /^\s*pull_request_target\s*:/m.test(source) || /^\s*-\s*pull_request_target\s*$/m.test(source);
}

for (const file of workflowFiles()) {
  const source = readFileSync(file, 'utf8');

  for (const check of forbiddenPatterns) {
    if (check.pattern.test(source)) {
      failures.push(`${file}: forbidden workflow pattern detected: ${check.name}`);
    }
  }

  if (usesPullRequestTarget(source)) {
    if (!allowedPullRequestTargetWorkflows.has(file)) {
      failures.push(`${file}: forbidden workflow pattern detected: unreviewed pull_request_target event`);
    } else if (source.includes('actions/checkout@')) {
      failures.push(`${file}: allowlisted pull_request_target workflow must not checkout pull request code`);
    } else if (!source.includes("ref: context.payload.repository.default_branch")) {
      failures.push(`${file}: allowlisted pull_request_target workflow must load policy from the trusted default branch`);
    }

    for (const check of forbiddenPullRequestTargetPatterns) {
      if (check.pattern.test(source)) {
        failures.push(`${file}: allowlisted pull_request_target workflow has forbidden authority: ${check.name}`);
      }
    }

    if (!source.includes('policy.automationAuthority?.administratorBypass !== false')) {
      failures.push(`${file}: allowlisted pull_request_target workflow must fail closed unless administrator bypass is disabled by trusted policy`);
    }
  }
}

console.log('EuroComply workflow sensitive pattern check');
console.log('-------------------------------------------');
console.log(`Scanned ${workflowFiles().length} workflow files.`);

if (failures.length > 0) {
  console.error('Workflow sensitive pattern failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Workflow sensitive patterns: ok');
}
