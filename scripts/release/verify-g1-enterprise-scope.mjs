#!/usr/bin/env node
// G1 acceptance verifier: pure source/evidence admission, NEVER a production release action.
import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifySEC05Evidence } from './verify-g1-sec05-evidence.mjs';
import { verifyBIL02Evidence } from './verify-g1-bil02-evidence.mjs';

const FULL_SHA = /^[a-f0-9]{40}$/;
const STATES = new Set(['NOT_VERIFIED', 'EVIDENCE_VERIFIED_PENDING_REVIEW', 'BLOCKED', 'PASS']);
const evidenceRoot = resolve(process.cwd());

const nonPlaceholder = (value) =>
  typeof value === 'string' && value.trim().length > 0 &&
  !/^(REPLACE_WITH|TBD|TODO|UNKNOWN)/i.test(value.trim());

// An attached filename is not proof. Accepted evidence must describe the same
// criterion, source SHA, provider status and bounded assertions. Unknown proof
// types fail closed until a dedicated verifier is reviewed.
function verifyEvidenceContent(id, proof, scopeSha) {
  const failures = [];
  const fail = (reason) => failures.push('PASS evidence content invalid: ' + id + ' (' + reason + ')');
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return ['PASS evidence content invalid: ' + id + ' (not an object)'];
  if (proof.subject !== id) fail('subject mismatch');
  if (!Number.isFinite(Date.parse(proof.observedAt)) || Date.parse(proof.observedAt) > Date.now()) fail('observation time invalid');
  if (id === 'OPS-01') {
    if (proof.schema !== 'risck-comply.g1.ops01-exact-production-deployment.v1') fail('schema mismatch');
    const v = proof.vercel ?? {}, gh = proof.github ?? {}, checks = proof.checks ?? {};
    if (v.gitSha !== scopeSha || gh.mainSha !== scopeSha || v.gitSha !== gh.mainSha) fail('production source SHA mismatch');
    if (v.state !== 'READY' || v.readyState !== 'READY' || v.target !== 'production' || v.gitRef !== 'main') fail('deployment not READY production');
    if (v.domain !== 'www.risckcomply.com' || v.domainVerified !== true || v.domainResolvedToThisDeployment !== true) fail('verified custom domain missing');
    if (!/^dpl_[A-Za-z0-9]+$/.test(String(v.deploymentId ?? ''))) fail('deployment identity missing');
    if (gh.repo !== 'renanescola40-afk/eurocomply_saas') fail('source repository mismatch');
    if (!['providerDeploymentReady', 'sourceShaMatchesMain', 'customDomainVerified',
      'domainResolvesToExactDeployment', 'sourceShaRecordedInAcceptance'].every(key => checks[key] === true)) fail('production attestation incomplete');
    if (proof.evidenceDecision !== 'PASS_OPS01_AT_OBSERVED_SHA') fail('provider admission not approved');
  } else if (id === 'BIL-01') {
    if (proof.schema !== 'risck-comply.g1-billing-catalog-live-prices.v1') fail('schema mismatch');
    if (proof.productionDeploymentSha !== scopeSha || proof.productionDomain !== 'www.risckcomply.com') fail('production SHA/domain mismatch');
    if (proof.stripeMode !== 'LIVE' || proof.currency !== 'EUR') fail('live billing source mismatch');
    const checks = proof.checks ?? {};
    const mustPass = ['allSixLivePricesActiveAndCatalogMatched','allSixProductsActive',
      'allSixCanonicalProductionBindingsMatch','allBindingsSetBeforeReadyDeployment',
      'enterpriseHasNoFixedPublicPrice','businessSalesLed'];
    if (!mustPass.every(key => checks[key] === true)) fail('billing provider attestations incomplete');
    if (checks.authenticCheckoutAndStripeWebhooksVerified !== false) fail('webhook test boundary misstated');
    const rows = Array.isArray(proof.rows) ? proof.rows : [];
    const expected = new Map([
      ['essential:month',4900], ['essential:year',49000],
      ['professional:month',14900], ['professional:year',149000],
      ['business:month',39900], ['business:year',399000],
    ]);
    const seen = new Set();
    for (const row of rows) {
      const key = String(row.publicPlan) + ':' + String(row.interval);
      if (seen.has(key)) fail('duplicate billing row');
      seen.add(key);
      if (!expected.has(key) || row.amountCents !== expected.get(key) || row.expectedAmountCents !== expected.get(key)) fail('price/catalog mismatch');
      if (row.priceActive !== true || row.productActive !== true || row.livemode !== true ||
        row.environmentExactMatch !== true || row.environmentUpdatedBeforeDeployed !== true ||
        row.admitted !== true || !row.environmentVariableTargets?.includes('production') ||
        !/^price_[A-Za-z0-9]+$/.test(String(row.stripePriceId ?? '')) ||
        !/^prod_[A-Za-z0-9]+$/.test(String(row.stripeProductId ?? '')) || row.currency !== 'eur') {
        fail('incomplete price/product/env attestation');
      }
    }
    if (rows.length !== 6 || seen.size !== 6 || [...expected.keys()].some(key => !seen.has(key))) fail('incomplete six-price coverage');
  } else if (id === 'BIL-02') {
    for (const reason of verifyBIL02Evidence(proof, scopeSha)) fail(reason);
  } else if (id === 'SEC-05') {
    for (const reason of verifySEC05Evidence(proof, scopeSha)) fail(reason);
  } else {
    fail('no approved evidence verifier for this criterion');
  }
  return failures;
}

export function evaluateG1Scope(scope, root = evidenceRoot) {
  const errors = [];
  const items = Array.isArray(scope?.mandatory) ? scope.mandatory : [];
  if (scope?.schema !== 'risck-comply.g1-enterprise-scope.v1') errors.push('invalid scope schema');
  if (!FULL_SHA.test(String(scope?.sourceBaselineSha ?? ''))) errors.push('invalid baseline SHA');
  if (scope?.scoring?.denominator !== 38) errors.push('denominator must be exactly 38');
  if (items.length !== 38) errors.push('mandatory register must contain 38 criteria');
  const ids = items.map(item => item?.id);
  if (new Set(ids).size !== ids.length) errors.push('duplicate A criterion IDs');
  const byId = new Map(items.map(item => [item?.id, item]));
  const passed = [];
  const evidencePending = [];

  for (const item of items) {
    const id = String(item?.id ?? '');
    if (!/^(SEC|FUN|BIL|DAT|QAT|OPS|TRU)-\d{2}$/.test(id)) errors.push('invalid criterion ID: ' + id);
    if (item?.classification !== 'A') errors.push('non-A entry in mandatory scope: ' + id);
    if (!STATES.has(item?.status)) errors.push('invalid state: ' + id);
    const dependencies = Array.isArray(item?.dependencies) ? item.dependencies : [];
    for (const dependency of dependencies) {
      if (!byId.has(dependency)) errors.push('unknown dependency: ' + id + ' -> ' + dependency);
    }
    if (item?.status !== 'PASS') {
      if (item?.acceptedBy != null || item?.acceptedAt != null) {
        errors.push('non-PASS entry contains acceptedBy/acceptedAt: ' + id);
      }
      if (item?.status === 'EVIDENCE_VERIFIED_PENDING_REVIEW') evidencePending.push(id);
      continue;
    }
    if (!nonPlaceholder(item.acceptedBy)) errors.push('PASS missing approver: ' + id);
    const date = Date.parse(item.acceptedAt);
    if (!Number.isFinite(date) || date > Date.now()) errors.push('PASS invalid acceptance time: ' + id);
    const refs = item.evidenceRefs;
    if (!Array.isArray(refs) || refs.length < 1) {
      errors.push('PASS has no evidence: ' + id);
    } else {
      for (const ref of refs) {
        if (!nonPlaceholder(ref) || ref.startsWith('/') || ref.includes('..')) {
          errors.push('PASS evidence path unsafe: ' + id);
          continue;
        }
        const target = resolve(root, ref);
        if (relative(root, target).startsWith('..') || !existsSync(target)) {
          errors.push('PASS evidence file missing: ' + id + ' (' + ref + ')');
        } else if (!ref.endsWith('.json')) {
          errors.push('PASS evidence must be machine-verifiable JSON: ' + id);
        } else {
          try {
            const proof = JSON.parse(readFileSync(target, 'utf8'));
            errors.push(...verifyEvidenceContent(id, proof, scope?.sourceBaselineSha));
            if (proof.observedAt !== item.acceptedAt) errors.push('PASS evidence acceptance timestamp mismatch: ' + id);
          } catch {
            errors.push('PASS evidence JSON unreadable: ' + id);
          }
        }
      }
    }
    for (const dependency of dependencies) {
      if (byId.get(dependency)?.status !== 'PASS') {
        errors.push('PASS dependency not accepted: ' + id + ' -> ' + dependency);
      }
    }
    passed.push(id);
  }

  return {
    schema: 'risck-comply.g1-scope-acceptance-verification.v1',
    sourceBaselineSha: scope?.sourceBaselineSha ?? null,
    denominator: 38,
    passed: passed.length,
    percent: Number((passed.length / 38 * 100).toFixed(2)),
    passIds: passed,
    evidencePending,
    errors,
    valid: errors.length === 0,
    productionReleaseAuthorized: false,
    allCriteriaPassedInScope: errors.length === 0 && passed.length === 38,
    enterprise100: false, // Scope evidence alone never proves a production release GO.
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = resolve(process.argv[2] ?? 'config/g1-enterprise-scope-v1.json');
  try {
    const scope = JSON.parse(readFileSync(path, 'utf8'));
    const result = evaluateG1Scope(scope);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (!result.valid || (process.argv.includes('--require-all-accepted') && !result.allCriteriaPassedInScope)) process.exitCode = 2;
  } catch (error) {
    process.stderr.write('G1 acceptance verification failed: ' + String(error) + '\n');
    process.exitCode = 2;
  }
}
