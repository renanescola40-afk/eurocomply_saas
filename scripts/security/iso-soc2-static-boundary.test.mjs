import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

// Static tripwires only. These tests are not executable tenant-isolation proofs.
test('role-management route has explicit guards before privileged RPC', () => {
  const body = read('src/app/api/team/members/role/route.ts');
  const start = body.indexOf('export async function POST(');
  assert.ok(start >= 0);
  const part = body.slice(start);
  for (const token of ['requireApiUser(', 'requireTrustedMutation(', 'requirePermission(', 'requireStepUpForRequest(']) {
    const i = part.indexOf(token);
    assert.ok(i >= 0, 'Missing guard: ' + token);
  }
  assert.match(part, /permission:\s*['"]manage_team['"]/);
  const call = part.indexOf('.rpc(');
  assert.ok(call > part.indexOf('requirePermission('), 'RPC must follow permission verification');
  assert.ok(call > part.indexOf('requireStepUpForRequest('), 'RPC must follow step-up verification');
});

test('organization creation validates authenticated identity before RPC', () => {
  const body = read('src/server/actions/organizations.ts');
  const start = body.indexOf('export async function createOrganization(');
  assert.ok(start >= 0);
  const part = body.slice(start);
  const user = part.indexOf('requireCurrentUser(');
  const validation = part.indexOf('createOrganizationSchema.safeParse(');
  const limit = part.indexOf('checkDistributedRateLimit(');
  const rpc = part.indexOf('.rpc(');
  assert.ok(user >= 0 && validation > user && limit > validation && rpc > limit);
  assert.ok(body.includes('sendEmail('), 'Onboarding email side effect must stay visible in review');
});

test('evidence-pack POST authorizes requested workflow before privileged call', () => {
  const body = read('src/app/api/ai-systems/route.ts');
  const start = body.indexOf('export async function POST(');
  assert.ok(start >= 0);
  const post = body.slice(start);
  const origin = post.indexOf('assertTrustedOrigin(');
  const user = post.indexOf('requireApiUser(');
  const org = post.indexOf('getCurrentOrganizationForUser(');
  const permission = post.indexOf('assertOrganizationPermission(');
  const rate = post.indexOf('checkDistributedRateLimit(');
  const branch = post.indexOf("if (workflow === 'evidence_pack')");
  const call = post.indexOf('createEvidencePackWorkflow(', branch);
  assert.ok(origin >= 0 && user > origin && org > user && permission > org && rate > permission && branch > rate && call > branch,
    'Evidence-pack call must follow trusted origin, identity, organization, permission and rate limit checks');
  assert.match(post.slice(permission,branch), /permission:\s*getWorkflowPermission\(workflow\)/);
  assert.match(post.slice(branch,call+400), /actorUserId:\s*user\.id/);
  assert.match(post.slice(branch,call+400), /organizationId:\s*organization\.id/);
});

test('security policy forbids unsupported ISO and SOC 2 claims', () => {
  const body = read('SECURITY.md');
  assert.match(body, /SOC 2/);
  assert.match(body, /ISO 27001/);
  assert.match(body, /unless approved evidence exists/);
});
