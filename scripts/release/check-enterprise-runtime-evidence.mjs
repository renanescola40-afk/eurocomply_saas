#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { validateAuthRbacRuntimeEvidence } from './validate-auth-rbac-runtime-evidence.mjs';
import { validateStepUpMfaRuntimeEvidence } from './validate-step-up-mfa-runtime-evidence.mjs';
import { validateStripeRuntimeEvidence } from './validate-stripe-runtime-evidence.mjs';

const runtimeDir = 'docs/security/evidence/runtime';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const finalValidationInProgress = process.env.FINAL_VALIDATION_IN_PROGRESS === 'true';
const failures = [];
const files = {
  envReadiness: `${runtimeDir}/enterprise-release-env-readiness.json`,
  productionSecrets: `${runtimeDir}/production-secrets-provider-stores.json`,
  supabaseRls: `${runtimeDir}/supabase-live-rls-validation.json`,
  deploymentSmoke: `${runtimeDir}/deployment-smoke-validation.json`,
  rollbackDryRun: `${runtimeDir}/rollback-dry-run-validation.json`,
  stepUpMfa: `${runtimeDir}/step-up-mfa-validation.json`,
  auditChain: `${runtimeDir}/audit-chain-live-validation.json`,
  uploadScanner: `${runtimeDir}/upload-malware-scan-validation.json`,
  stripeBilling: `${runtimeDir}/stripe-billing-validation.json`,
  observability: `${runtimeDir}/observability-smoke-validation.json`,
  branchProtection: `${runtimeDir}/branch-protection-required-checks.json`,
  externalReview: `${runtimeDir}/external-security-review-or-pentest.json`,
  authRbacFinal: `${runtimeDir}/auth-rbac-final-validation.json`,
  finalValidation: `${runtimeDir}/final-validation-runner.json`,
};
function readJson(path) {
  if (!existsSync(path)) { failures.push(`${path} is missing`); return null; }
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { failures.push(`${path} is invalid JSON: ${error instanceof Error ? error.message : error}`); return null; }
}
function complete(path, evidence, label) {
  if (!evidence) return false;
  if (evidence.status !== 'Complete') { failures.push(`${label} must be Complete for enterprise release; current status is ${evidence.status ?? '<missing>'} (${path})`); return false; }
  return true;
}
function basic(label, path) { return complete(path, readJson(path), label); }
function commandPassed(finalValidation, commandName) {
  return (finalValidation.commands ?? []).some((command) => command.command === commandName && ['passed', 'Go', 'GO', true].includes(command.result ?? command.passed));
}

const envReadiness = readJson(files.envReadiness);
if (complete(files.envReadiness, envReadiness, 'Enterprise env readiness evidence')) {
  if (envReadiness.outcome !== 'passed') failures.push(`${files.envReadiness} outcome must be passed`);
  if (envReadiness.noSecretsStored !== true) failures.push(`${files.envReadiness} must prove noSecretsStored=true`);
  if (envReadiness.evidenceIntegrity?.containsSensitiveValues !== false) failures.push(`${files.envReadiness} must prove containsSensitiveValues=false`);
  if (envReadiness.evidenceIntegrity?.rawUrlsStored !== false) failures.push(`${files.envReadiness} must not store raw URLs`);
  for (const check of envReadiness.checks ?? []) if (check.required === true && check.passed !== true) failures.push(`${files.envReadiness} required check ${check.name ?? '<unknown>'} must pass`);
}

basic('Production secrets provider evidence', files.productionSecrets);
const supabase = readJson(files.supabaseRls);
if (complete(files.supabaseRls, supabase, 'Supabase live RLS evidence') && supabase.outcome !== 'passed') failures.push(`${files.supabaseRls} outcome must be passed`);
basic('Upload scanner evidence', files.uploadScanner);
const stripe = readJson(files.stripeBilling);
if (stripe) {
  for (const failure of validateStripeRuntimeEvidence(stripe)) failures.push(`${files.stripeBilling} ${failure}`);
  complete(files.stripeBilling, stripe, 'Stripe billing evidence');
}
basic('Observability evidence', files.observability);
basic('Branch protection/ruleset evidence', files.branchProtection);

const deployment = readJson(files.deploymentSmoke);
if (complete(files.deploymentSmoke, deployment, 'Deployment smoke evidence')) {
  if (deployment.outcome !== 'passed') failures.push(`${files.deploymentSmoke} outcome must be passed`);
  if (!Array.isArray(deployment.targets) || deployment.targets.length === 0) failures.push(`${files.deploymentSmoke} must list smoke targets`);
  if (!Array.isArray(deployment.smokeTargets?.passed) || !Array.isArray(deployment.smokeTargets?.failed)) failures.push(`${files.deploymentSmoke} must include normalized smokeTargets passed/failed arrays`);
  if ((deployment.smokeTargets?.failed ?? []).length > 0) failures.push(`${files.deploymentSmoke} normalized smokeTargets.failed must be empty`);
  if ((deployment.smokeTargets?.passed ?? []).length === 0) failures.push(`${files.deploymentSmoke} normalized smokeTargets.passed must not be empty`);
  for (const target of deployment.targets ?? []) {
    if (target?.passed !== true) failures.push(`${files.deploymentSmoke} has failing target ${target?.baseUrl ?? '<unknown>'}`);
    if (target?.checks?.healthOk !== true) failures.push(`${files.deploymentSmoke} missing /api/health proof`);
    if (target?.checks?.readyProtected !== true) failures.push(`${files.deploymentSmoke} missing protected /api/ready proof`);
    if (target?.checks?.readyOk !== true) failures.push(`${files.deploymentSmoke} missing ready /api/ready proof`);
  }
}

const rollback = readJson(files.rollbackDryRun);
if (complete(files.rollbackDryRun, rollback, 'Rollback dry-run evidence')) {
  if (rollback.outcome !== 'passed') failures.push(`${files.rollbackDryRun} outcome must be passed`);
  if (rollback.dryRun?.mutatesProduction !== false) failures.push(`${files.rollbackDryRun} must prove mutatesProduction=false`);
  if (rollback.targetValidation?.passed !== true) failures.push(`${files.rollbackDryRun} targetValidation.passed must be true`);
}

const stepUp = readJson(files.stepUpMfa);
if (stepUp) {
  for (const failure of validateStepUpMfaRuntimeEvidence(stepUp)) failures.push(`${files.stepUpMfa} ${failure}`);
  complete(files.stepUpMfa, stepUp, 'MFA/IdP provider proof evidence');
}

const auditChain = readJson(files.auditChain);
if (complete(files.auditChain, auditChain, 'Audit-chain target-live evidence')) {
  const acceptance = auditChain.acceptanceCriteria ?? {};
  for (const key of ['appendNormal', 'appendConcurrent', 'auditChainDetectsTampering', 'missingPreviousHashDetected', 'liveProofAttached']) if (acceptance[key] !== true) failures.push(`${files.auditChain} acceptanceCriteria.${key} must be true`);
}

const external = readJson(files.externalReview);
if (complete(files.externalReview, external, 'External security review/pentest evidence')) {
  if (external.evidenceIntegrity?.realExternalReportAttached !== true) failures.push(`${files.externalReview} must reference a real external report`);
  if (external.evidenceIntegrity?.placeholderOnly !== false) failures.push(`${files.externalReview} must not be placeholder-only when Complete`);
  if (!String(external.reportReference ?? '').trim()) failures.push(`${files.externalReview} must include reportReference`);
}

const authRbac = readJson(files.authRbacFinal);
if (authRbac) {
  for (const failure of validateAuthRbacRuntimeEvidence(authRbac)) failures.push(`${files.authRbacFinal} ${failure}`);
  complete(files.authRbacFinal, authRbac, 'Auth/RBAC final runtime evidence');
}

if (!finalValidationInProgress) {
  const finalValidation = readJson(files.finalValidation);
  if (complete(files.finalValidation, finalValidation, 'Final validation runner evidence')) {
    if (finalValidation.outcome !== 'passed') failures.push(`${files.finalValidation} outcome must be passed`);
    const requiredCommands = ['npm ci','npm run lint','npm run typecheck','npm run test','npm run build','npm run test:e2e','npm run security:ci','npm run security:rls:live','npm run release:deployment-smoke','npm run release:observability-smoke','npm run release:rollback:dry-run','npm run release:enterprise-runtime-evidence','npm run security:p0-runtime-gap:strict'];
    for (const command of requiredCommands) if (!commandPassed(finalValidation, command)) failures.push(`${files.finalValidation} must include passed ${command}`);
  }
}

if (existsSync(registerPath)) {
  const rows = readFileSync(registerPath, 'utf8').split('\n').filter((line) => line.startsWith('|') && !line.includes('---'));
  for (const row of rows) {
    const [item, status] = row.split('|').map((cell) => cell.trim()).filter(Boolean);
    if (item && item !== 'Evidence item' && status !== 'Complete') failures.push(`${registerPath} still has non-Complete item: ${item} = ${status}`);
  }
} else failures.push(`${registerPath} is missing`);

if (failures.length > 0) { console.error('Enterprise runtime evidence gate failed:'); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log('Enterprise runtime evidence gate passed.');
