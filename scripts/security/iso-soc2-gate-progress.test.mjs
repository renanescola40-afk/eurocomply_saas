import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeGateRegister } from './iso-soc2-gate-progress.mjs';

const gate = (id, status) => `| ${id} | Descriptive gate | Actual independent evidence required | ${status} |`;
const fixture = (status = () => 'NOT_VERIFIED') => Array.from({ length: 11 }, (_, i) => gate(`G${String(i + 1).padStart(2, '0')}`, status(i + 1))).join('\n');

test('reports 100% remaining when all 11 gates lack verified closure', () => {
  const result = summarizeGateRegister(fixture());
  assert.equal(result.gate_count_remaining_to_close, 11);
  assert.equal(result.pct_remaining_of_eleven, 100);
  assert.equal(result.pct_closed_of_eleven, 0);
});
test('partial and PASS states do not inflate completed gates', () => {
  const result = summarizeGateRegister(fixture(i => i === 4 ? 'PARTIAL_METADATA' : i === 5 ? 'PASS' : 'NOT_STARTED'));
  assert.equal(result.register_reported_partial, 1);
  assert.equal(result.register_reported_pass_but_not_closed, 1);
  assert.equal(result.gate_count_remaining_to_close, 11);
});
test('only explicitly closed statuses count as register closure', () => {
  const result = summarizeGateRegister(fixture(i => i === 1 ? 'CLOSED' : i === 2 ? 'AUDIT_ACCEPTED' : 'NOT_VERIFIED'));
  assert.equal(result.register_reported_closed, 2);
  assert.equal(result.gate_count_remaining_to_close, 9);
  assert.equal(result.pct_remaining_of_eleven, 81.82);
  assert.equal(result.independently_verified_iso27001_certification, false);
});
test('missing gate is rejected', () => assert.throws(() => summarizeGateRegister(fixture().replace(/^\| G11 .+$/m, '')), /Missing required gate/));
test('duplicate gate is rejected', () => assert.throws(() => summarizeGateRegister(fixture() + '\n' + gate('G01', 'CLOSED')), /Duplicate gate/));
test('undocumented status is rejected', () => assert.throws(() => summarizeGateRegister(fixture(i => i === 1 ? 'COMPLETE_100' : 'NOT_STARTED')), /Unexpected gate status/));
test('malformed gate record is rejected', () => assert.throws(() => summarizeGateRegister(fixture().replace(' | NOT_VERIFIED |', ' | extra | NOT_VERIFIED |')), /exactly four gate columns/));
