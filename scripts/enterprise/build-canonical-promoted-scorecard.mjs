#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const SAFE_DECISIONS = new Set(['SAFE_EVIDENCE_PROMOTED', 'PARTIAL_SAFE_EVIDENCE_PROMOTED']);
const FORBIDDEN_PROMOTED_CONTROLS = new Set(['REC-01', 'SEC-10', 'REL-10']);
const VALID_STATUS = new Set(['PASS', 'PARTIAL', 'NOT_VERIFIED', 'BLOCKED', 'FAIL', 'NOT_APPLICABLE']);

function fail(message) { throw new Error(message); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }

function classification(score, criticalOpen) {
  if (score === 100 && criticalOpen === 0) return 'ENTERPRISE_READY';
  if (score >= 90) return 'ENTERPRISE_CANDIDATE';
  if (score >= 75) return 'ADVANCED';
  if (score >= 60) return 'CONTROLLED_BETA';
  return 'NOT_READY';
}

function validateControlSet(controls, label) {
  if (!Array.isArray(controls) || controls.length !== 100) fail(`${label} must contain exactly 100 controls`);
  const ids = new Set();
  for (const control of controls) {
    if (!/^[A-Z0-9][A-Z0-9._-]{1,79}$/.test(String(control?.id ?? ''))) fail(`${label} contains invalid control id`);
    if (ids.has(control.id)) fail(`${label} contains duplicate control ${control.id}`);
    if (!VALID_STATUS.has(control.status)) fail(`${label} contains invalid status for ${control.id}`);
    if (typeof control.critical !== 'boolean') fail(`${label} control ${control.id} must declare critical`);
    ids.add(control.id);
  }
  return ids;
}

export function buildCanonicalPromotedScorecard({ baseline, promotion, closeout, targetSha, sourceRunId, generatedAt = new Date().toISOString() }) {
  if (!FULL_SHA.test(String(targetSha ?? ''))) fail('targetSha must be a full lowercase Git SHA');
  if (!/^\d+$/.test(String(sourceRunId ?? ''))) fail('sourceRunId must be numeric');
  if (baseline?.schema !== 'risck-comply.enterprise-readiness-scorecard.v1') fail('baseline schema mismatch');
  if (promotion?.schema !== 'risck-comply.enterprise-scorecard-promotion.v1') fail('promotion schema mismatch');
  if (closeout?.schema !== 'risck-comply.enterprise-promotion-closeout.v4') fail('closeout schema mismatch');
  if (promotion.targetSha !== targetSha || closeout.targetSha !== targetSha) fail('exact-SHA promotion provenance mismatch');
  if (closeout.repository !== CANONICAL_REPOSITORY) fail('closeout repository mismatch');
  if (closeout.profile !== 'safe') fail('only safe promotion bundles are accepted');
  if (!SAFE_DECISIONS.has(closeout.closeoutDecision)) fail('safe promotion closeout decision is not accepted');
  if (closeout.releaseDecision !== 'NO_GO' || promotion.releaseDecision !== 'NO_GO') fail('safe promotion must remain NO_GO');
  if (closeout.coherencePromoted !== false) fail('safe promotion cannot promote final coherence');
  if (closeout.rejectedEvidence !== 0 || promotion.rejectedEvidence?.length !== 0) fail('rejected evidence must be zero');
  if (String(closeout.workflowRunId) !== String(sourceRunId)) fail('source workflow run mismatch');

  const baselineIds = validateControlSet(baseline.controls, 'baseline');
  const promotionIds = validateControlSet(promotion.controls, 'promotion');
  if ([...baselineIds].some((id) => !promotionIds.has(id))) fail('promotion control registry mismatch');

  const baselineById = new Map(baseline.controls.map((control) => [control.id, control]));
  const controls = promotion.controls.map((control) => {
    const previous = baselineById.get(control.id);
    if (!previous) fail(`promotion contains unknown control ${control.id}`);
    if (previous.status === 'PASS' && control.status !== 'PASS') fail(`promotion downgrades baseline control ${control.id}`);
    if (control.status === 'PASS' && previous.status !== 'PASS') {
      if (FORBIDDEN_PROMOTED_CONTROLS.has(control.id)) fail(`safe promotion cannot promote ${control.id}`);
      if (!Array.isArray(control.evidence) || control.evidence.length === 0) fail(`promoted control ${control.id} has no accepted evidence`);
    }
    return { ...previous, ...control };
  });

  const counts = controls.reduce((acc, control) => ({ ...acc, [control.status]: (acc[control.status] ?? 0) + 1 }), {});
  const completePercent = counts.PASS ?? 0;
  if (completePercent !== promotion.score?.completePercent) fail('promotion score/count mismatch');
  if (completePercent < baseline.completedPercent) fail('promotion cannot reduce canonical completion');
  if (completePercent >= 100) fail('safe promotion cannot declare 100 percent');

  const criticalOpenControls = controls.filter((control) => control.critical && control.status !== 'PASS');
  const domainsById = new Map();
  for (const control of controls) {
    const current = domainsById.get(control.domain) ?? { id: control.domain, name: control.domain, weight: 0, earned: 0 };
    current.weight += Number(control.weight || 0);
    if (control.status === 'PASS') current.earned += Number(control.weight || 0);
    domainsById.set(control.domain, current);
  }
  const domains = [...domainsById.values()].map((domain) => ({
    id: domain.id,
    name: domain.name,
    weight: Number(domain.weight.toFixed(4)),
    scorePercent: domain.weight === 0 ? 0 : Number(((domain.earned / domain.weight) * 100).toFixed(1)),
  }));

  const scorecard = {
    schema: 'risck-comply.enterprise-readiness-scorecard.v1',
    generatedFromRealEvidence: true,
    generatedAt,
    targetSha,
    scorePercent: completePercent,
    scoreOutOfTen: Number((completePercent / 10).toFixed(2)),
    completedPercent: completePercent,
    remainingPercent: 100 - completePercent,
    classification: classification(completePercent, criticalOpenControls.length),
    releaseDecision: 'NO_GO',
    publishRecommendation: completePercent >= 75 ? 'PRODUCTION_WITH_ENTERPRISE_LIMITATIONS' : completePercent >= 60 ? 'CONTROLLED_BETA' : 'DO_NOT_PUBLISH',
    criticalOpen: criticalOpenControls.length,
    criticalFailed: controls.filter((control) => control.critical && control.status === 'FAIL').length,
    counts,
    domains,
    controls,
    promotionProvenance: {
      profile: 'safe',
      closeoutDecision: closeout.closeoutDecision,
      sourceRunId: String(sourceRunId),
      promotedLanes: closeout.promotedLanes ?? [],
      blockedLanes: closeout.blockedLanes ?? [],
      promotedDeltaPercent: closeout.promotedDeltaPercent,
      promotionSha256: promotion.integrity?.sha256 ?? null,
      closeoutSha256: digest(closeout),
    },
  };
  return { ...scorecard, integrity: { sha256: digest(scorecard) } };
}

export function renderCanonicalMarkdown(scorecard) {
  return [
    '# RISCK COMPLY Enterprise Readiness — promoted exact-SHA scorecard',
    '',
    `- **Overall:** ${scorecard.completedPercent}% (${scorecard.scoreOutOfTen}/10)`,
    `- **Remaining:** ${scorecard.remainingPercent}%`,
    `- **Release decision:** ${scorecard.releaseDecision}`,
    `- **Safe promotion:** ${scorecard.promotionProvenance.closeoutDecision}`,
    `- **Promoted lanes:** ${scorecard.promotionProvenance.promotedLanes.join(', ') || 'none'}`,
    `- **Blocked lanes:** ${scorecard.promotionProvenance.blockedLanes.join(', ') || 'none'}`,
    `- **Source run:** ${scorecard.promotionProvenance.sourceRunId}`,
    `- **Exact SHA:** ${scorecard.targetSha}`,
    '',
    '> This scorecard incorporates validated non-destructive runtime evidence only. Recovery, independent Assurance and REL-10 remain excluded, so the release decision is NO_GO.',
    '',
  ].join('\n');
}

function parseArgs(argv) { const out = {}; for (let index = 0; index < argv.length; index += 2) out[argv[index]?.replace(/^--/, '')] = argv[index + 1]; return out; }
function main() {
  const options = parseArgs(process.argv.slice(2));
  const required = ['baseline', 'promotion', 'closeout', 'sha', 'run', 'output', 'markdown'];
  for (const key of required) if (!options[key]) fail(`missing --${key}`);
  const scorecard = buildCanonicalPromotedScorecard({
    baseline: JSON.parse(readFileSync(resolve(options.baseline), 'utf8')),
    promotion: JSON.parse(readFileSync(resolve(options.promotion), 'utf8')),
    closeout: JSON.parse(readFileSync(resolve(options.closeout), 'utf8')),
    targetSha: options.sha,
    sourceRunId: options.run,
  });
  mkdirSync(dirname(resolve(options.output)), { recursive: true });
  mkdirSync(dirname(resolve(options.markdown)), { recursive: true });
  writeFileSync(resolve(options.output), `${JSON.stringify(scorecard, null, 2)}\n`, { mode: 0o600 });
  writeFileSync(resolve(options.markdown), renderCanonicalMarkdown(scorecard), { mode: 0o600 });
  console.log(JSON.stringify({ completedPercent: scorecard.completedPercent, remainingPercent: scorecard.remainingPercent, releaseDecision: scorecard.releaseDecision, promotedLanes: scorecard.promotionProvenance.promotedLanes, blockedLanes: scorecard.promotionProvenance.blockedLanes }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
