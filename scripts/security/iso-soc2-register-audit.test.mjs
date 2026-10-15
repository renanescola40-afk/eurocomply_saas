import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRegister, parseCsv } from './iso-soc2-register-audit.mjs';

const header = 'control_id,domain,applicability,status,evidence_status,owner,risk_reference,notes';
const groups = [[5, 'Organizational', 37], [6, 'People', 8], [7, 'Physical', 14], [8, 'Technological', 34]];
function fixture() {
  const lines = [header];
  for (const [section, domain, count] of groups) for (let n = 1; n <= count; n++) {
    lines.push('A.' + section + '.' + n + ',' + domain + ',NOT_ASSESSED,NOT_ASSESSED,NOT_VERIFIED,UNASSIGNED,,pending');
  }
  return lines.join('\n') + '\n';
}

test('inventory completeness does not equal readiness', () => {
  const x = auditRegister(fixture());
  assert.equal(x.controls_present, 93);
  assert.equal(x.controls_assessed_for_applicability, 0);
  assert.equal(x.independently_verified_evidence_in_this_register, 0);
  assert.equal(x.iso27001_overall_readiness_percentage, null);
});
test('CSV reader handles quoted commas and escaped quotes', () => {
  assert.deepEqual(parseCsv('a,b\n"x,y","z""q"\n'), [['a','b'], ['x,y','z"q']]);
});
test('duplicate control ID fails closed', () => {
  assert.throws(() => auditRegister(fixture() + 'A.5.1,Organizational,NOT_ASSESSED,NOT_ASSESSED,NOT_VERIFIED,UNASSIGNED,,duplicate\n'), /Duplicate control/);
});
test('missing control ID fails closed', () => {
  assert.throws(() => auditRegister(fixture().replace(/^A\.8\.34,.*\n/m, '')), /Missing Annex A control/);
});
test('wrong domain fails closed', () => {
  assert.throws(() => auditRegister(fixture().replace('A.6.1,People,', 'A.6.1,Physical,')), /Incorrect domain/);
});
test('unsubstantiated evidence claims fail closed', () => {
  assert.throws(() => auditRegister(fixture().replace('NOT_VERIFIED', 'VERIFIED')), /cannot be proved/);
});
