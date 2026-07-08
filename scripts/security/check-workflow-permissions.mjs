import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const allowedPullRequestTargetWorkflows = new Set([]);
const checkoutCredentialExceptions = new Set([
  '.github/workflows/p0-commit-lockfile.yml',
]);
const criticalWorkflowFiles = new Set([
  '.github/workflows/actionlint.yml',
  '.github/workflows/ci.yml',
  '.github/workflows/code-review.yml',
  '.github/workflows/codeql.yml',
  '.github/workflows/dependency-review.yml',
  '.github/workflows/full-security-suite.yml',
  '.github/workflows/gitleaks.yml',
  '.github/workflows/secret-scanning.yml',
  '.github/workflows/security-ci.yml',
  '.github/workflows/semgrep.yml',
  '.github/workflows/upload-security-ci.yml',
]);
const failures = [];
const warnings = [];

function workflowFiles() {
  if (!existsSync(workflowDir)) return [];
  return readdirSync(workflowDir)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => join(workflowDir, name));
}

function report(file, message) {
  const issue = `${file}: ${message}`;
  if (criticalWorkflowFiles.has(file)) failures.push(issue);
  else warnings.push(issue);
}

function lineIndent(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function stripInlineComment(line) {
  return line.replace(/\s+#.*$/, '').trimEnd();
}

function hasTopLevelPermissions(source) {
  return source
    .split('\n')
    .some((line) => /^permissions:\s*(?:$|\{[^}]*\}\s*$)/.test(stripInlineComment(line)));
}

function listJobsWithoutPermissions(source) {
  if (hasTopLevelPermissions(source)) return [];

  const lines = source.split('\n');
  const jobsIndex = lines.findIndex((line) => /^jobs:\s*$/.test(stripInlineComment(line)));
  if (jobsIndex === -1) return ['<jobs section missing>'];

  const jobs = [];
  for (let index = jobsIndex + 1; index < lines.length; index += 1) {
    const line = stripInlineComment(lines[index]);
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (lineIndent(line) === 0) break;

    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (!jobMatch) continue;

    const jobName = jobMatch[1];
    let hasJobPermissions = false;
    for (let inner = index + 1; inner < lines.length; inner += 1) {
      const innerLine = stripInlineComment(lines[inner]);
      if (!innerLine.trim() || innerLine.trim().startsWith('#')) continue;
      const indent = lineIndent(innerLine);
      if (indent <= 2) break;
      if (/^    permissions:\s*(?:$|\{[^}]*\}\s*$)/.test(innerLine)) {
        hasJobPermissions = true;
        break;
      }
    }

    if (!hasJobPermissions) jobs.push(jobName);
  }

  return jobs;
}

function hasExplicitPermissionsCoverage(source) {
  return hasTopLevelPermissions(source) || listJobsWithoutPermissions(source).length === 0;
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

  if (!hasExplicitPermissionsCoverage(source)) {
    const jobsWithoutPermissions = listJobsWithoutPermissions(source);
    report(
      file,
      `missing explicit top-level permissions block and job-level permissions for: ${jobsWithoutPermissions.join(', ') || 'unknown jobs'}`,
    );
  }

  if (usesWriteAll(source)) {
    report(file, 'permissions write-all is forbidden');
  }

  if (usesPullRequestTarget(source) && !allowedPullRequestTargetWorkflows.has(file)) {
    report(file, 'pull_request_target is forbidden unless explicitly allowlisted');
  }

  if (!hasCheckoutPersistCredentialsFalse(source)) {
    if (hasJustifiedCheckoutWriteException(file, source)) {
      warnings.push(`${file}: checkout credentials are persisted only because this workflow commits/pushes a lockfile.`);
    } else {
      report(file, 'actions/checkout must set persist-credentials: false when the workflow does not push back to the repository');
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
