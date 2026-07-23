#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const ALLOWED_STATUS = new Set(['UNASSIGNED', 'ASSIGNED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'ACCEPTED', 'REJECTED', 'EXPIRED']);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function validateOperationsRegistry(registry, campaign) {
  const failures = [];
  if (registry?.schema !== 'risck-comply.qualified-review-operations.v1') failures.push('invalid operations registry schema');
  if (registry?.repository !== 'renanescola40-afk/eurocomply_saas') failures.push('unexpected repository');
  if (!Array.isArray(registry?.reviews)) failures.push('reviews must be an array');
  const campaignById = new Map((campaign?.requirements || []).map((item) => [item.id, item]));
  const ids = new Set();
  let weight = 0;
  for (const review of registry?.reviews || []) {
    if (ids.has(review.id)) failures.push(`duplicate review id: ${review.id}`);
    ids.add(review.id);
    const requirement = campaignById.get(review.id);
    if (!requirement) failures.push(`unknown review requirement: ${review.id}`);
    if (requirement && (requirement.workstream !== review.workstream || requirement.weight !== review.weight)) failures.push(`campaign mismatch: ${review.id}`);
    if (!ALLOWED_STATUS.has(review.status)) failures.push(`invalid status: ${review.id}`);
    if (!Array.isArray(review.requiredExpertise) || review.requiredExpertise.length === 0) failures.push(`required expertise missing: ${review.id}`);
    if (review.independenceRequired !== true) failures.push(`independence must be required: ${review.id}`);
    if (review.status === 'ACCEPTED') failures.push(`accepted status cannot be committed without a validated evidence package: ${review.id}`);
    weight += Number(review.weight || 0);
  }
  if (ids.size !== campaignById.size) failures.push(`operations registry must cover all ${campaignById.size} campaign requirements`);
  if (weight !== 51) failures.push(`qualified review weight must total 51; found ${weight}`);
  return failures;
}

export function buildHandoff({ registry, campaign, targetSha, generatedAt = new Date().toISOString() }) {
  if (!FULL_SHA.test(targetSha)) throw new Error('targetSha must be a full lowercase Git SHA');
  const failures = validateOperationsRegistry(registry, campaign);
  if (failures.length) throw new Error(failures.join('; '));
  const campaignById = new Map(campaign.requirements.map((item) => [item.id, item]));
  const reviews = registry.reviews.map((review) => {
    const requirement = campaignById.get(review.id);
    const body = {
      schema: 'risck-comply.qualified-review-handoff.v1',
      repository: registry.repository,
      targetSha,
      generatedAt,
      reviewId: review.id,
      workstream: review.workstream,
      weight: review.weight,
      scope: requirement.scope,
      requiredExpertise: review.requiredExpertise,
      independenceRequired: true,
      status: review.status,
      instructions: [
        'Review the exact-SHA evidence pack and record findings, limitations and final disposition.',
        'Declare qualifications, employer or client relationships and every actual or potential conflict of interest.',
        'Do not mark ACCEPTED unless the signed evidence package passes the canonical schema and validator.',
        'Acceptance is not certification, regulator approval or a customer legal-compliance guarantee.'
      ],
      requiredOutputs: [
        'reviewer identity and qualification evidence',
        'conflict-of-interest declaration',
        'review scope and evidence digest',
        'findings and limitations',
        'signed disposition with validity window'
      ]
    };
    return { ...body, integrity: { sha256: digest(body) } };
  });
  const summary = {
    schema: 'risck-comply.qualified-review-handoff-summary.v1',
    repository: registry.repository,
    targetSha,
    generatedAt,
    totalReviews: reviews.length,
    totalWeight: reviews.reduce((sum, item) => sum + item.weight, 0),
    acceptedWeight: 0,
    remainingWeight: reviews.reduce((sum, item) => sum + item.weight, 0),
    decision: 'QUALIFIED_REVIEW_OPERATIONS_NO_GO',
    truthBoundary: 'No qualified human review is created or accepted by this generator.'
  };
  return { summary: { ...summary, integrity: { sha256: digest(summary) } }, reviews };
}

function main() {
  const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
  const outputRoot = resolve(process.env.QUALIFIED_REVIEW_HANDOFF_ROOT || 'artifacts/qualified-review-handoff');
  const registry = JSON.parse(readFileSync(resolve(process.env.QUALIFIED_REVIEW_OPERATIONS_REGISTRY || 'docs/compliance/evidence/qualified-review-operations-registry.json'), 'utf8'));
  const campaign = JSON.parse(readFileSync(resolve(process.env.QUALIFIED_REVIEW_CAMPAIGN_REGISTRY || 'docs/compliance/evidence/qualified-review-campaign-registry.json'), 'utf8'));
  const handoff = buildHandoff({ registry, campaign, targetSha });
  const summaryPath = resolve(outputRoot, 'qualified-review-handoff-summary.json');
  mkdirSync(dirname(summaryPath), { recursive: true });
  writeFileSync(summaryPath, `${JSON.stringify(handoff.summary, null, 2)}\n`, { mode: 0o600 });
  for (const review of handoff.reviews) {
    const output = resolve(outputRoot, 'reviews', review.reviewId, 'handoff.json');
    if (!output.startsWith(`${outputRoot}/`)) throw new Error(`unsafe output path: ${review.reviewId}`);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(review, null, 2)}\n`, { mode: 0o600 });
  }
  console.log(JSON.stringify({ generated: handoff.reviews.length, remainingWeight: handoff.summary.remainingWeight, targetSha }));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();
