#!/usr/bin/env node
// Source-only, read-only CircleCI diagnosis. Never triggers or reruns a pipeline.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PROJECT = 'gh/renanescola40-afk/eurocomply_saas';
const FAILED = new Set(['failed', 'failing', 'error', 'errored', 'canceled', 'cancelled', 'timedout', 'timed_out']);
const RELEVANT = /failed|error|assertionerror|\bts\d{4}\b|\boom\b|killed|fatal|memory|out of memory|no space left|econn|enotfound|eai_again|could not resolve|rate limit|429|503|npm err|permission denied|exit code/i;

export function classifyCircleJob(job, stepOutput = '') {
  const status = String(job?.status ?? job?.outcome ?? 'unknown').toLowerCase();
  const actions = (Array.isArray(job?.steps) ? job.steps : []).flatMap(step =>
    (Array.isArray(step?.actions) ? step.actions : []).map(action => ({
      step: String(step.name || 'unnamed'),
      exitCode: Number.isInteger(action?.exit_code) ? action.exit_code : null,
      status: String(action?.status || '').toLowerCase(),
      index: action?.index ?? null,
    })));
  const failed = actions.find(action => (action.exitCode !== null && action.exitCode !== 0) || FAILED.has(action.status));
  const base = { project: PROJECT, jobNumber: job?.build_num ?? null, jobStatus: status,
    failedStep: failed?.step ?? null, exitCode: failed?.exitCode ?? null,
    stepsObserved: actions.length, pipelineTriggered: false, conclusion: 'UNKNOWN',
    confidence: 'INSUFFICIENT', logInspected: Boolean(stepOutput) };
  if (!failed) return { ...base, conclusion: FAILED.has(status) ? 'FAILED_WITHOUT_STEP_DETAILS' : 'NO_FAILED_STEP_OBSERVED',
    nextAction: FAILED.has(status) ? 'Inspect CircleCI job metadata and first failing step.' : 'Verify job status and exact SHA before any acceptance.' };
  const msg = String(stepOutput).slice(0, 300_000), label = failed.step.toLowerCase();
  if (failed.exitCode === 137 || /out of memory|heap out of memory|oomkilled|memory limit exceeded/i.test(msg))
    return { ...base, conclusion: 'RESOURCE_EXHAUSTION', confidence: 'HIGH', nextAction: 'Inspect memory and exit-137 cause; no blind rerun.' };
  if (/checkout|image pull|start container|initialize environment|spin up environment|executor|docker layer/.test(label) ||
      /could not resolve|enotfound|eai_again|econnreset|econnrefused|network unreachable|dns lookup|service unavailable|http 503/i.test(msg))
    return { ...base, conclusion: 'INFRASTRUCTURE_OR_NETWORK', confidence: 'HIGH', nextAction: 'Review runner/image/network availability without changing application checks.' };
  if (/npm ci|install dependenc|package-lock|dependency install/.test(label) &&
      /eresolve|elockverify|missing:|invalid:|etarget|npm err|npm error/i.test(msg))
    return { ...base, conclusion: 'DEPENDENCY_OR_LOCKFILE', confidence: 'HIGH', nextAction: 'Reproduce npm ci locally with pinned Node/npm and exact lockfile.' };
  if (/branch|sha|credential|environment guard|verify exact|config/.test(label) ||
      /unexpected branch|refusing non-identical checkout|forbidden credential|configuration error/i.test(msg))
    return { ...base, conclusion: 'CI_CONFIGURATION_OR_POLICY', confidence: msg ? 'HIGH' : 'STEP_NAME_ONLY', nextAction: 'Fix branch/parameter/source guard; preserve fail-closed checks.' };
  if ((/lint|typescript|typecheck|unit test|vitest|test|build|security/.test(label)) &&
      /assertionerror|failed test|\bts\d{4}\b|eslint|\berror:\s|test failed|tests? failed/i.test(msg))
    return { ...base, conclusion: 'SOURCE_OR_TEST_FAILURE', confidence: 'HIGH', nextAction: 'Use precise failing assertion/file at exact commit; do not weaken checks.' };
  if (/lint|typescript|typecheck|unit test|vitest|test|build|security/.test(label))
    return { ...base, conclusion: 'QUALITY_STEP_FAILED_CAUSE_UNKNOWN', confidence: 'STEP_NAME_ONLY', nextAction: 'Read failed step output; source vs infrastructure not yet established.' };
  return { ...base, conclusion: 'FAILED_STEP_CAUSE_UNKNOWN', confidence: 'INSUFFICIENT', nextAction: 'Read the failed step output to classify the root cause.' };
}

function argsOf(argv) {
  const args = { job: 416, input: null, output: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--job') args.job = Number(argv[++i]);
    else if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--fetch-step-output') args.output = true;
    else throw new Error('invalid_argument');
  }
  if (!Number.isSafeInteger(args.job) || args.job <= 0 || (args.input !== null && (!args.input || args.input.startsWith('-'))))
    throw new Error('invalid_job_or_input');
  return args;
}

async function readApiJob(job) {
  const token = process.env.CIRCLECI_TOKEN;
  if (!token || !token.trim()) throw new Error('missing_CIRCLECI_TOKEN_readonly');
  const response = await fetch(`https://circleci.com/api/v1.1/project/${PROJECT}/${job}`, {
    method: 'GET', headers: { 'Circle-Token': token, Accept: 'application/json' }, signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`circleci_job_http_${response.status}`);
  return response.json();
}

async function readFailedStepOutput(job) {
  const actions = (Array.isArray(job?.steps) ? job.steps : []).flatMap(step => step?.actions ?? []);
  const failed = actions.find(a => (Number.isInteger(a?.exit_code) && a.exit_code !== 0) || FAILED.has(String(a?.status || '').toLowerCase()));
  if (!failed?.output_url) return '';
  const u = new URL(failed.output_url);
  if (u.protocol !== 'https:' || !/^(?:[\w-]+\.)*(?:circleci\.com|amazonaws\.com|googleapis\.com)$/.test(u.hostname))
    throw new Error('untrusted_CircleCI_output_host');
  // Do not forward the CircleCI API token to short-lived presigned output URLs.
  const res = await fetch(u, { method: 'GET', signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`step_output_http_${res.status}`);
  const body = (await res.text()).slice(0, 300_000);
  try {
    const json = JSON.parse(body);
    return Array.isArray(json) ? json.map(x => String(x.message ?? '')).join('\n').slice(0, 300_000) : '';
  } catch { return body; }
}

async function main() {
  try {
    const args = argsOf(process.argv.slice(2));
    const job = args.input ? JSON.parse(readFileSync(args.input, 'utf8')) : await readApiJob(args.job);
    const output = args.output ? await readFailedStepOutput(job) : '';
    // Never print raw step stdout, tokens, signed URLs, or provider secrets.
    console.log(JSON.stringify(classifyCircleJob(job, output), null, 2));
  } catch (error) {
    const code = String(error?.message || 'unknown_error').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
    process.stderr.write('CIRCLECI_READONLY_DIAGNOSTIC_FAILED: ' + code + '\n');
    process.exitCode = 2;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
