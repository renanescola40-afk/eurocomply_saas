import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyPaidOwnerPlaywrightProof } from '../../scripts/quality/check-paid-owner-playwright-proof.mjs';

const path = 'tests/e2e/retention-export-functional.spec.ts';
const title = 'owner clicks export, receives MFA dialog, and unverified API request is denied';
const makeReport = (status='expected', attempt='passed') => ({
  suites: [{ title:'e2e', suites:[{title:'paid owner', specs:[{
    file:path, title, tests:[{status, results:[{status:attempt}]}],
  }]}] }],
  stats:{expected:1, unexpected:0, flaky:0, skipped:0},
});

test('allows one genuinely passed named browser test but never claims provider delivery', () => {
  const result = verifyPaidOwnerPlaywrightProof(makeReport());
  assert.equal(result.providerPersistenceVerified,false);
  assert.equal(result.subscriptionLifecycleVerified,false);
});
for (const [label, report] of [
  ['missing report', null],
  ['no browser suites', {suites:[],stats:{expected:0,unexpected:0,flaky:0,skipped:0}}],
  ['skipped test', makeReport('skipped','skipped')],
  ['failed test', makeReport('unexpected','failed')],
  ['interrupted test', makeReport('unexpected','interrupted')],
  ['flaky test', { ...makeReport(), stats:{...makeReport().stats,flaky:1}}],
  ['other failures', { ...makeReport(), stats:{...makeReport().stats,unexpected:1}}],
  ['skipped sibling in same Playwright run', (() => {const r=makeReport();r.stats.skipped=1;r.suites[0].suites[0].specs.push({file:path,title:'anonymous smoke test',tests:[{status:'skipped',results:[]}]});return r;})()],
  ['missing skipped count', (() => {const r=makeReport();delete r.stats.skipped;return r;})()],
  ['missing expected count', (() => {const r=makeReport();delete r.stats.expected;return r;})()],
  ['zero expected results', (() => {const r=makeReport();r.stats.expected=0;return r;})()],
  ['negative skipped count', (() => {const r=makeReport();r.stats.skipped=-1;return r;})()],
  ['duplicate matching test', (() => {const r=makeReport();r.suites.push(structuredClone(r.suites[0]));return r;})()],
  ['wrong test title', (() => {const r=makeReport();r.suites[0].suites[0].specs[0].title='different';return r;})()],
  ['wrong test path', (() => {const r=makeReport();r.suites[0].suites[0].specs[0].file='tests/e2e/else.spec.ts';return r;})()],
  ['retry after failure', (() => {const r=makeReport();r.suites[0].suites[0].specs[0].tests[0].results.unshift({status:'failed'});return r;})()],
]) {
  test('rejects '+label, () => assert.throws(() => verifyPaidOwnerPlaywrightProof(report), /qa_/));
}
