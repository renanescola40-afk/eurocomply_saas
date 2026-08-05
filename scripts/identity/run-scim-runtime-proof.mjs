#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const env = (name) => String(process.env[name] ?? '').trim();
const output = env('SCIM_RUNTIME_OUTPUT') || 'artifacts/scim-runtime-proof/scim-runtime-validation.json';
const requiredEnv = [
  'PRODUCTION_URL',
  'SCIM_PROOF_BEARER_TOKEN',
  'SCIM_PROOF_EMAIL_DOMAIN',
  'SCIM_PROOF_CONFIRMATION',
  'TARGET_SHA',
];
const failures = [];
const checks = {
  protectedMainExecution: env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main',
  exactShaBound: /^[a-f0-9]{40}$/.test(env('TARGET_SHA'))
    && env('GITHUB_SHA').toLowerCase() === env('TARGET_SHA').toLowerCase(),
  explicitConfirmation: env('SCIM_PROOF_CONFIRMATION') === 'EXECUTE_SCIM_RUNTIME_PROOF',
};

for (const name of requiredEnv) if (!env(name)) failures.push(`missing_${name.toLowerCase()}`);

let origin = null;
try {
  const url = new URL(env('PRODUCTION_URL'));
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('production_url_must_be_https_origin');
  }
  origin = url.origin;
  checks.httpsTarget = true;
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'invalid_production_url');
  checks.httpsTarget = false;
}

const bearer = env('SCIM_PROOF_BEARER_TOKEN');
const suffix = `${Date.now()}-${randomBytes(6).toString('hex')}`;
const userName = `scim-proof-${suffix}@${env('SCIM_PROOF_EMAIL_DOMAIN')}`;
const userExternalId = `proof-user-${suffix}`;
const groupExternalId = `proof-group-${suffix}`;
const groupName = `SCIM Runtime Proof ${suffix}`;
const groupNameUpdated = `${groupName} Updated`;
let userId = null;
let groupId = null;
let userDeprovisioned = false;
let groupRemoved = false;
let allNoStore = true;
let allScimJson = true;

const USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
const GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group';
const LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
const PATCH_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp';
const ENTERPRISE_SCHEMA = 'urn:eurocomply:params:scim:schemas:extension:enterprise:2.0:User';

function requireCondition(value, code) {
  if (!value) throw new Error(code);
}

function headers({ authenticated = true, json = false } = {}) {
  const value = { accept: 'application/scim+json' };
  if (authenticated) value.authorization = `Bearer ${bearer}`;
  if (json) value['content-type'] = 'application/scim+json';
  return value;
}

async function request(path, {
  method = 'GET',
  body,
  authenticated = true,
  expected = [200],
  expectJson = true,
} = {}) {
  const response = await fetch(`${origin}/api/scim/v2${path}`, {
    method,
    headers: headers({ authenticated, json: body !== undefined }),
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });

  const cacheControl = String(response.headers.get('cache-control') ?? '').toLowerCase();
  allNoStore &&= cacheControl.includes('no-store');
  if (expectJson) {
    const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();
    allScimJson &&= contentType.includes('application/scim+json');
  }

  const payload = expectJson ? await response.json().catch(() => null) : null;
  requireCondition(expected.includes(response.status), `unexpected_${method.toLowerCase()}_${path.replaceAll('/', '_')}`);
  return payload;
}

async function cleanup() {
  const cleanupFailures = [];
  if (groupId && !groupRemoved) {
    try {
      await request(`/Groups/${encodeURIComponent(groupId)}`, {
        method: 'DELETE',
        expected: [204],
        expectJson: false,
      });
      groupRemoved = true;
    } catch {
      cleanupFailures.push('group_cleanup_failed');
    }
  }
  if (userId && !userDeprovisioned) {
    try {
      await request(`/Users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        expected: [204],
        expectJson: false,
      });
      userDeprovisioned = true;
    } catch {
      cleanupFailures.push('user_deprovision_cleanup_failed');
    }
  }
  return cleanupFailures;
}

try {
  requireCondition(failures.length === 0, 'scim_preconditions_failed');
  requireCondition(Object.values(checks).every(Boolean), 'scim_execution_context_invalid');

  const serviceProvider = await request('/ServiceProviderConfig');
  requireCondition(Array.isArray(serviceProvider?.schemas) && serviceProvider.schemas.length > 0, 'service_provider_config_invalid');
  checks.serviceProviderConfigValidated = true;

  const resourceTypes = await request('/ResourceTypes');
  requireCondition(Array.isArray(resourceTypes?.Resources), 'resource_types_invalid');
  checks.resourceTypesValidated = true;

  const schemas = await request('/Schemas');
  requireCondition(Array.isArray(schemas?.Resources), 'schemas_invalid');
  checks.schemasValidated = true;

  await request('/Users?count=1', {
    authenticated: false,
    expected: [401, 403],
  });
  checks.unauthorizedDenied = true;

  const createdUser = await request('/Users', {
    method: 'POST',
    expected: [201],
    body: {
      schemas: [USER_SCHEMA, ENTERPRISE_SCHEMA],
      externalId: userExternalId,
      userName,
      displayName: 'SCIM Runtime Proof',
      active: true,
      roles: [{ value: 'viewer' }],
      [ENTERPRISE_SCHEMA]: { role: 'viewer', seatType: 'viewer' },
    },
  });
  requireCondition(typeof createdUser?.id === 'string' && createdUser.id.length > 0, 'created_user_id_missing');
  requireCondition(createdUser?.userName === userName && createdUser?.active === true, 'created_user_invalid');
  userId = createdUser.id;
  checks.userCreated = true;

  const listedUser = await request(`/Users?startIndex=1&count=10&filter=${encodeURIComponent(`userName eq "${userName}"`)}`);
  requireCondition(
    listedUser?.schemas?.includes(LIST_SCHEMA)
      && listedUser?.totalResults === 1
      && listedUser?.Resources?.[0]?.id === userId,
    'user_filter_invalid',
  );
  checks.userFilterValidated = true;

  const readUser = await request(`/Users/${encodeURIComponent(userId)}`);
  requireCondition(readUser?.id === userId && readUser?.active === true, 'user_read_invalid');
  checks.userRead = true;

  const patchedUser = await request(`/Users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: {
      schemas: [PATCH_SCHEMA],
      Operations: [
        { op: 'Replace', path: 'externalId', value: `${userExternalId}-updated` },
        { op: 'Replace', path: `${ENTERPRISE_SCHEMA}:role`, value: 'viewer' },
        { op: 'Replace', path: `${ENTERPRISE_SCHEMA}:seatType`, value: 'viewer' },
      ],
    },
  });
  requireCondition(patchedUser?.id === userId && patchedUser?.externalId === `${userExternalId}-updated`, 'user_patch_invalid');
  checks.userPatched = true;

  const deactivatedUser = await request(`/Users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: {
      schemas: [PATCH_SCHEMA],
      Operations: [{ op: 'Replace', path: 'active', value: false }],
    },
  });
  requireCondition(deactivatedUser?.active === false, 'user_deactivation_invalid');
  checks.userDeactivated = true;

  const reactivatedUser = await request(`/Users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: {
      schemas: [PATCH_SCHEMA],
      Operations: [{ op: 'Replace', path: 'active', value: true }],
    },
  });
  requireCondition(reactivatedUser?.active === true, 'user_reactivation_invalid');
  checks.userReactivated = true;

  const createdGroup = await request('/Groups', {
    method: 'POST',
    expected: [201],
    body: {
      schemas: [GROUP_SCHEMA],
      externalId: groupExternalId,
      displayName: groupName,
      members: [{ value: userId }],
    },
  });
  requireCondition(typeof createdGroup?.id === 'string' && createdGroup.id.length > 0, 'created_group_id_missing');
  requireCondition(createdGroup?.members?.some((member) => member?.value === userId), 'created_group_membership_invalid');
  groupId = createdGroup.id;
  checks.groupCreated = true;

  const listedGroup = await request(`/Groups?startIndex=1&count=10&filter=${encodeURIComponent(`displayName eq "${groupName}"`)}`);
  requireCondition(
    listedGroup?.schemas?.includes(LIST_SCHEMA)
      && listedGroup?.totalResults === 1
      && listedGroup?.Resources?.[0]?.id === groupId,
    'group_filter_invalid',
  );
  checks.groupFilterValidated = true;

  const readGroup = await request(`/Groups/${encodeURIComponent(groupId)}`);
  requireCondition(readGroup?.id === groupId, 'group_read_invalid');
  checks.groupRead = true;

  const patchedGroup = await request(`/Groups/${encodeURIComponent(groupId)}`, {
    method: 'PATCH',
    body: {
      schemas: [PATCH_SCHEMA],
      Operations: [
        { op: 'Replace', path: 'displayName', value: groupNameUpdated },
        { op: 'Replace', path: 'members', value: [{ value: userId }] },
      ],
    },
  });
  requireCondition(
    patchedGroup?.displayName === groupNameUpdated
      && patchedGroup?.members?.some((member) => member?.value === userId),
    'group_patch_invalid',
  );
  checks.groupPatched = true;
  checks.groupMembershipValidated = true;

  await request(`/Groups/${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
    expected: [204],
    expectJson: false,
  });
  groupRemoved = true;
  checks.groupDeleted = true;

  await request(`/Groups/${encodeURIComponent(groupId)}`, {
    expected: [404],
  });
  checks.deletedGroupDenied = true;

  await request(`/Users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    expected: [204],
    expectJson: false,
  });
  userDeprovisioned = true;
  checks.userDeprovisioned = true;

  const afterDelete = await request(`/Users/${encodeURIComponent(userId)}`);
  requireCondition(afterDelete?.id === userId && afterDelete?.active === false, 'deprovisioned_user_state_invalid');
  checks.deprovisionedUserInactive = true;

  checks.noStoreResponses = allNoStore;
  checks.scimContentType = allScimJson;
  requireCondition(allNoStore, 'scim_no_store_missing');
  requireCondition(allScimJson, 'scim_content_type_missing');
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'unknown_scim_runtime_failure');
} finally {
  failures.push(...await cleanup());
  checks.cleanupComplete = groupRemoved && userDeprovisioned;
}

const canonicalChecks = {
  protectedMainExecution: checks.protectedMainExecution === true,
  exactShaBound: checks.exactShaBound === true,
  explicitConfirmation: checks.explicitConfirmation === true,
  httpsTarget: checks.httpsTarget === true,
  serviceProviderConfigValidated: checks.serviceProviderConfigValidated === true,
  resourceTypesValidated: checks.resourceTypesValidated === true,
  schemasValidated: checks.schemasValidated === true,
  unauthorizedDenied: checks.unauthorizedDenied === true,
  userCreated: checks.userCreated === true,
  userFilterValidated: checks.userFilterValidated === true,
  userRead: checks.userRead === true,
  userPatched: checks.userPatched === true,
  userDeactivated: checks.userDeactivated === true,
  userReactivated: checks.userReactivated === true,
  groupCreated: checks.groupCreated === true,
  groupFilterValidated: checks.groupFilterValidated === true,
  groupRead: checks.groupRead === true,
  groupPatched: checks.groupPatched === true,
  groupMembershipValidated: checks.groupMembershipValidated === true,
  groupDeleted: checks.groupDeleted === true,
  deletedGroupDenied: checks.deletedGroupDenied === true,
  userDeprovisioned: checks.userDeprovisioned === true,
  deprovisionedUserInactive: checks.deprovisionedUserInactive === true,
  noStoreResponses: checks.noStoreResponses === true,
  scimContentType: checks.scimContentType === true,
  cleanupComplete: checks.cleanupComplete === true,
};

const passed = failures.length === 0 && Object.values(canonicalChecks).every(Boolean);
const evidence = {
  schema: 'risck-comply.scim-runtime-evidence.v1',
  evidenceItem: 'scim-users-groups-runtime-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  targetSha: env('TARGET_SHA') || null,
  observedSha: env('GITHUB_SHA') || null,
  repository: env('GITHUB_REPOSITORY') || null,
  runId: env('GITHUB_RUN_ID') || null,
  controlsVerified: passed ? ['IAM-09'] : [],
  checks: canonicalChecks,
  failures: [...new Set(failures)].sort(),
  evidenceIntegrity: {
    containsSensitiveValues: false,
    bearerTokenStored: false,
    emailStored: false,
    externalIdentifiersStored: false,
    resourceIdentifiersStored: false,
    providerResponsesStored: false,
    networkHeadersStored: false,
    inactiveIdentityRetainedForAudit: userDeprovisioned,
  },
  boundary: 'Protected exact-SHA SCIM protocol and lifecycle proof against a dedicated Enterprise test tenant. It proves the production SCIM Users/Groups surface and tenant-bound credential path at execution time; it does not prove Microsoft Entra ID, Okta, Google Workspace, customer-specific SAML login, provider certification, or 10,000-member performance.',
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) process.exit(1);
