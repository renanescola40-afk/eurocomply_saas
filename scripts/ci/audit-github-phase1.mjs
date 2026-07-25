import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDirectory = '.github/workflows';
const strict = process.argv.includes('--strict');

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function scalar(value = '') {
  return value.trim().replace(/^['"]|['"]$/g, '').trim();
}

function workflowName(source, filename) {
  const match = source.match(/^name:\s*(.+?)\s*$/m);
  return match ? scalar(match[1]) : filename.replace(/\.ya?ml$/i, '');
}

function jobNames(source) {
  const result = [];
  let inJobs = false;
  let current = null;

  for (const line of source.split('\n')) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (/^[^\s#][^:]*:\s*$/.test(line)) break;

    const job = line.match(/^  ([A-Za-z0-9_-]+):\s*(?:#.*)?$/);
    if (job) {
      current = { id: job[1], name: job[1], timeout: false };
      result.push(current);
      continue;
    }

    const name = line.match(/^    name:\s*(.+?)\s*$/);
    if (current && name) current.name = scalar(name[1]);
    if (current && /^    timeout-minutes:\s*\d+/.test(line)) current.timeout = true;
  }

  return result;
}

if (!existsSync(workflowDirectory)) {
  console.error('Missing .github/workflows directory.');
  process.exit(1);
}

const workflows = readdirSync(workflowDirectory)
  .filter((entry) => /\.ya?ml$/i.test(entry))
  .sort()
  .map((entry) => {
    const path = join(workflowDirectory, entry);
    const source = read(path);
    return {
      path,
      name: workflowName(source, entry),
      pullRequest: /^\s*pull_request\s*:/m.test(source),
      pullRequestTarget: /^\s*pull_request_target\s*:/m.test(source),
      push: /^\s*push\s*:/m.test(source),
      schedule: /^\s*schedule\s*:/m.test(source),
      dispatch: /^\s*workflow_dispatch\s*:/m.test(source),
      jobs: jobNames(source),
    };
  });

const checkOwners = new Map();
for (const workflow of workflows) {
  for (const job of workflow.jobs) {
    const check = `${workflow.name} / ${job.name}`;
    const owners = checkOwners.get(check) ?? [];
    owners.push(workflow.path);
    checkOwners.set(check, owners);
  }
}

const duplicateChecks = [...checkOwners.entries()]
  .filter(([, owners]) => owners.length > 1)
  .map(([check, owners]) => ({ check, owners }));
const pullRequestTarget = workflows.filter((workflow) => workflow.pullRequestTarget);
const unboundedPrJobs = workflows
  .filter((workflow) => workflow.pullRequest)
  .flatMap((workflow) => workflow.jobs
    .filter((job) => !job.timeout)
    .map((job) => ({ workflow: workflow.path, job: job.name })));

const dependabot = read('.github/dependabot.yml');
const codeql = workflows.find((workflow) => workflow.path.endsWith('/codeql.yml'));
const codeowners = read('.github/CODEOWNERS');

const findings = [];
if (!dependabot) findings.push('Dependabot configuration is missing.');
if (!codeql) findings.push('CodeQL workflow is missing.');
if (!codeowners) findings.push('CODEOWNERS is missing.');
if (pullRequestTarget.length > 0) findings.push(`${pullRequestTarget.length} workflow(s) use pull_request_target and require explicit security review.`);
if (duplicateChecks.length > 0) findings.push(`${duplicateChecks.length} duplicate workflow/job check name(s) were found.`);
if (unboundedPrJobs.length > 0) findings.push(`${unboundedPrJobs.length} pull-request job(s) have no timeout-minutes.`);

const report = {
  schema_version: 1,
  repository: 'renanescola40-afk/eurocomply_saas',
  workflow_count: workflows.length,
  pull_request_workflow_count: workflows.filter((workflow) => workflow.pullRequest).length,
  scheduled_workflow_count: workflows.filter((workflow) => workflow.schedule).length,
  dependabot_configured: Boolean(dependabot),
  codeql_configured: Boolean(codeql),
  codeowners_configured: Boolean(codeowners),
  pull_request_target_workflows: pullRequestTarget.map((workflow) => workflow.path),
  duplicate_check_names: duplicateChecks,
  pull_request_jobs_without_timeout: unboundedPrJobs,
  findings,
};

console.log(JSON.stringify(report, null, 2));

if (strict && findings.length > 0) {
  process.exitCode = 1;
}
