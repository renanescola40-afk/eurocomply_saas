import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function source(path) { return readFileSync(resolve(root,path),'utf8'); }

// This suite statically guards authorization boundaries; it is NOT a runtime
// tenancy test, SOC 2 opinion, certification or substitute for threat modeling.
test('role-management API requires user, permission, step-up and trusted mutation', () => {
  const body=source('src/app/api/team/members/role/route.ts');
  for(const guard of ['requireApiUser(', 'requireTrustedMutation(', 'requirePermission(', 'requireStepUpForRequest('])
    assert.ok(body.includes(guard), 'Expected guard missing: '+guard);
  assert.match(body,/permission:\s*['"]manage_team['"]/);
});

test('organization creation requires user validation before privileged RPC',()=>{
  const body=source('src/server/actions/organizations.ts');
  for(const text of ['requireCurrentUser(', 'createOrganizationSchema.safeParse(', 'checkDistributedRateLimit('])
    assert.ok(body.includes(text),'Expected guard missing: '+text);
  const guard=body.indexOf('requireCurrentUser(',body.indexOf('export async function createOrganization'));
  const rpc=body.indexOf('.rpc(',guard);
  assert.ok(guard>=0 && rpc>guard,'Guard must appear before RPC call');
});

test('evidence pack route exposes authentication and organization permission guard',()=>{
  const body=source('src/app/api/ai-systems/route.ts');
  for(const guard of ['assertTrustedOrigin(', 'requireApiUser(', 'assertOrganizationPermission(', "create_enterprise_evidence_pack_atomic"])
    assert.ok(body.includes(guard), 'Expected marker missing: '+guard);
  // This does not validate the authorization flow to the specific RPC.
});

test('security docs prohibit unsupported ISO and SOC 2 claims',()=>{
  const body=source('SECURITY.md');
  assert.match(body,/SOC 2/);
  assert.match(body,/ISO 27001/);
  assert.match(body,/unless approved evidence exists/);
});
