#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const planPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'templates', 'external-review-plan.template.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredCoverage = [
  'authentication and authorization boundaries',
  'tenant isolation and data access boundaries',
  'secrets handling and deployment configuration',
  'dependency and supply-chain posture',
  'logging, monitoring, and incident response readiness',
  'release-blocking finding triage',
];

function fail(message) {
  console.error(`External review plan check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(planPath)) {
  fail(`missing plan file: ${planPath}`);
}

let plan;
try {
  plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${planPath}: ${error.message}`);
}

if (planPath.includes('/runtime/') && placeholderPattern.test(JSON.stringify(plan))) {
  fail('runtime plan must not contain placeholders');
}

if (plan.planId !== 'external-review-plan') {
  fail('planId must be external-review-plan');
}

if (!Array.isArray(plan.allowedOutcomes) || !plan.allowedOutcomes.includes('independent_review_complete')) {
  fail('allowedOutcomes must include independent_review_complete');
}

if (!plan.allowedOutcomes.includes('approved_private_beta_exception')) {
  fail('allowedOutcomes must include approved_private_beta_exception');
}

if (!Array.isArray(plan.redactionRules) || plan.redactionRules.length < 3) {
  fail('redactionRules must include safe handling rules');
}

if (!Array.isArray(plan.requiredCoverage)) {
  fail('requiredCoverage must be an array');
}

for (const coverage of requiredCoverage) {
  if (!plan.requiredCoverage.includes(coverage)) {
    fail(`missing required coverage: ${coverage}`);
  }
}

if (!plan.assessmentPlan || !plan.assessmentPlan.providerOrReviewer || !plan.assessmentPlan.assessmentType || !plan.assessmentPlan.scopeSummary) {
  fail('assessmentPlan must include providerOrReviewer, assessmentType, and scopeSummary');
}

if (!plan.exceptionPlan || plan.exceptionPlan.allowed !== true) {
  fail('exceptionPlan.allowed must be true to document the approved exception path');
}

for (const key of ['requiresRiskOwner', 'requiresExpiry', 'requiresCompensatingControls', 'requiresApprovalReference']) {
  if (plan.exceptionPlan[key] !== true) {
    fail(`exceptionPlan.${key} must be true`);
  }
}

if (plan.evidenceOutputTarget !== 'docs/security/evidence/runtime/external-security-review-or-pentest.json') {
  fail('evidenceOutputTarget must point to the external review runtime evidence JSON');
}

console.log(`External review plan is valid: ${planPath}`);
