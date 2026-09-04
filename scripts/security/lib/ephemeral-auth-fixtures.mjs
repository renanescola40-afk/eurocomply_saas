import { randomBytes, randomUUID } from 'node:crypto';

const EPHEMERAL_INSERT_MAX_ATTEMPTS = 3;
const EPHEMERAL_INSERT_RETRY_BASE_MS = 250;
const EPHEMERAL_INSERT_RETRY_CAP_MS = 1_500;

function password() {
  return `Rc!${randomBytes(24).toString('base64url')}9a`;
}

function safePurpose(value) {
  return String(value || 'enterprise-runtime-proof')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'enterprise-runtime-proof';
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isAmbiguousTransportError(error) {
  if (!error) return false;
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '');
  return status >= 500
    || ['57014', '57P01', '57P02', '57P03', '08000', '08001', '08003', '08004', '08006', '08007', '08P01'].includes(code)
    || /timeout|timed out|gateway|upstream|connection|temporar|unavailable/i.test(message);
}

function retryDelay(attempt) {
  return Math.min(
    EPHEMERAL_INSERT_RETRY_CAP_MS,
    EPHEMERAL_INSERT_RETRY_BASE_MS * (2 ** Math.max(0, attempt - 1)),
  );
}

async function readOneById(admin, table, id) {
  const { data, error } = await admin
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return { data, error };
}

async function insertOne(admin, table, row) {
  if (!row?.id) throw new Error(`ephemeral_${table}_stable_id_required`);

  let lastError = null;
  for (let attempt = 1; attempt <= EPHEMERAL_INSERT_MAX_ATTEMPTS; attempt += 1) {
    const { data, error } = await admin.from(table).insert(row).select('*').single();
    if (!error && data?.id === row.id) return data;

    lastError = error;

    // A 5xx/timeout response is ambiguous: PostgREST may have committed the row
    // even though the client never received the response. Always reconcile by the
    // pre-generated stable id before deciding whether another insert is safe.
    const readback = await readOneById(admin, table, row.id);
    if (!readback.error && readback.data?.id === row.id) return readback.data;

    if (!isAmbiguousTransportError(error) || attempt === EPHEMERAL_INSERT_MAX_ATTEMPTS) {
      break;
    }
    await sleep(retryDelay(attempt));
  }

  const suffix = isAmbiguousTransportError(lastError) ? '_transport_exhausted' : '';
  throw new Error(`ephemeral_${table}_create_failed${suffix}`);
}

function userAbsenceWasProven(data, error) {
  if (!error) return !data?.user;
  const status = Number(error?.status || 0);
  const message = String(error?.message || '');
  return status === 404 || /not found/i.test(message);
}

async function cleanupOrganizationCommercialDependencies(admin, organizationIds) {
  if (organizationIds.length === 0) return;

  // Delete results can also be transport-ambiguous. Final cleanup acceptance is
  // based on explicit readback below rather than on the HTTP response alone.
  await admin
    .from('organization_entitlements')
    .delete()
    .in('organization_id', organizationIds);

  await admin
    .from('enterprise_contracts')
    .delete()
    .in('organization_id', organizationIds);
}

async function verifyOrganizationCommercialDependenciesRemoved(admin, organizationIds, failures) {
  if (organizationIds.length === 0) return;

  const { data: entitlements, error: entitlementError } = await admin
    .from('organization_entitlements')
    .select('organization_id')
    .in('organization_id', organizationIds);
  if (entitlementError || (Array.isArray(entitlements) && entitlements.length > 0)) {
    failures.push('organization_entitlement_cleanup_not_verified');
  }

  const { data: contracts, error: contractError } = await admin
    .from('enterprise_contracts')
    .select('id')
    .in('organization_id', organizationIds);
  if (contractError || (Array.isArray(contracts) && contracts.length > 0)) {
    failures.push('enterprise_contract_cleanup_not_verified');
  }
}

export async function cleanupEphemeralAuthFixtures(admin, created) {
  if (!created) return { verified: false, failures: ['fixture_tracker_missing'] };
  const failures = [];

  for (const id of [...created.memberships].reverse()) {
    await admin.from('organization_members').delete().eq('id', id);
  }

  // Production provisions an enterprise contract and organization entitlement when
  // an organization is created. Both are intentional tenant records, but their
  // foreign keys are RESTRICT to protect real commercial history. The protected
  // runtime fixture must therefore remove only its own synthetic dependants before
  // deleting the synthetic organization.
  await cleanupOrganizationCommercialDependencies(admin, created.organizations);

  for (const id of [...created.organizations].reverse()) {
    await admin.from('organizations').delete().eq('id', id);
  }
  for (const id of [...created.users].reverse()) {
    await admin.auth.admin.deleteUser(id);
  }

  if (created.memberships.length > 0) {
    const { data, error } = await admin
      .from('organization_members')
      .select('id')
      .in('id', created.memberships);
    if (error || (Array.isArray(data) && data.length > 0)) {
      failures.push('membership_cleanup_not_verified');
    }
  }

  await verifyOrganizationCommercialDependenciesRemoved(admin, created.organizations, failures);

  if (created.organizations.length > 0) {
    const { data, error } = await admin
      .from('organizations')
      .select('id')
      .in('id', created.organizations);
    if (error || (Array.isArray(data) && data.length > 0)) {
      failures.push('organization_cleanup_not_verified');
    }
  }
  for (const id of created.users) {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (!userAbsenceWasProven(data, error)) failures.push('user_cleanup_not_verified');
  }

  return { verified: failures.length === 0, failures: [...new Set(failures)] };
}

export async function createEphemeralAuthFixtures(
  admin,
  { purpose = 'enterprise-runtime-proof' } = {},
) {
  const normalizedPurpose = safePurpose(purpose);
  const suffix = `${Date.now()}-${randomUUID()}`;
  const created = { users: [], organizations: [], memberships: [] };

  const createUser = async (label, rolePurpose) => {
    const credentials = {
      email: `${normalizedPurpose}-${label}-${suffix}@example.com`,
      password: password(),
    };
    const { data, error } = await admin.auth.admin.createUser({
      ...credentials,
      email_confirm: true,
      user_metadata: { purpose: rolePurpose },
    });
    if (error || !data.user?.id) throw new Error(`ephemeral_${label}_user_create_failed`);
    created.users.push(data.user.id);
    return { id: data.user.id, ...credentials };
  };

  try {
    const owner = await createUser('owner', `${normalizedPurpose}-owner`);
    const member = await createUser('member', `${normalizedPurpose}-member`);
    const outsider = await createUser('outsider', `${normalizedPurpose}-outsider`);

    const organizationAId = randomUUID();
    created.organizations.push(organizationAId);
    const organizationA = await insertOne(admin, 'organizations', {
      id: organizationAId,
      name: `Enterprise Runtime A ${suffix}`,
      slug: `${normalizedPurpose}-a-${suffix}`,
      created_by: owner.id,
    });

    const organizationBId = randomUUID();
    created.organizations.push(organizationBId);
    const organizationB = await insertOne(admin, 'organizations', {
      id: organizationBId,
      name: `Enterprise Runtime B ${suffix}`,
      slug: `${normalizedPurpose}-b-${suffix}`,
      created_by: outsider.id,
    });

    const ownerMembershipId = randomUUID();
    created.memberships.push(ownerMembershipId);
    const ownerMembership = await insertOne(admin, 'organization_members', {
      id: ownerMembershipId,
      organization_id: organizationA.id,
      user_id: owner.id,
      role: 'owner',
    });

    const memberMembershipId = randomUUID();
    created.memberships.push(memberMembershipId);
    const memberMembership = await insertOne(admin, 'organization_members', {
      id: memberMembershipId,
      organization_id: organizationA.id,
      user_id: member.id,
      role: 'member',
    });

    const outsiderMembershipId = randomUUID();
    created.memberships.push(outsiderMembershipId);
    const outsiderMembership = await insertOne(admin, 'organization_members', {
      id: outsiderMembershipId,
      organization_id: organizationB.id,
      user_id: outsider.id,
      role: 'owner',
    });

    return {
      created,
      owner,
      member,
      outsider,
      organizationA,
      organizationB,
      ownerMembership,
      memberMembership,
      outsiderMembership,
    };
  } catch (error) {
    const cleanup = await cleanupEphemeralAuthFixtures(admin, created);
    if (!cleanup.verified) {
      throw new Error(`ephemeral_fixture_setup_failed_cleanup_incomplete:${cleanup.failures.join(',')}`);
    }
    throw error;
  }
}
