import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const target = readFileSync(new URL('../../docs/pentest/maasec/pentest-target.md', import.meta.url), 'utf8');

test('MaaSec scoping snapshot cannot silently authorize active production testing', () => {
  assert.match(target, /Status:\s*`PREPARED_NOT_AUTHORIZED`/);
  assert.match(target, /PRODUCTION_ACTIVE_TESTING=NOT_AUTHORIZED/);
  assert.match(target, /docs\/security\/PENTEST_SCOPE\.md/);
  assert.match(target, /dedicated non-production environment/);
  assert.match(target, /separately repository-reviewed scope amendment/);
  assert.match(target, /explicit owner authorization/);
});
test('MaaSec assessment target is bound to an observed exact release, not stale implied approval', () => {
  assert.match(target, /70d3545f414d063379d481fd238aed563e05edda/);
  assert.match(target, /dpl_CmyiHWky6g41su26PE1nyGwwCS1f/);
  assert.match(target, /point-in-time observation/);
  assert.match(target, /Re-query both main and the canonical alias/);
  assert.match(target, /EXTERNAL_SECURITY_ASSURANCE=NO_PASS/);
});
