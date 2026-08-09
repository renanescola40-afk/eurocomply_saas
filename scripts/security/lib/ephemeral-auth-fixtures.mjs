import { randomBytes, randomUUID } from 'node:crypto';

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

async function insertOne(admin, table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error || !data?.id) throw new Error(`ephemeral_${table}_create_failed`);
  return data;
}

export async function cleanupEphemeralAuthFixtures(admin, created) {
  if (!created) return { verified: false, failures: ['fixture_tracker_missing'] };
  const failures = [];

  for (const id of [...created.memberships].reverse()) {
    const { error } = await admin.from('organization_members').delete().eq('id', id);
    if (error) failures.push('membership_cleanup_failed');
  }
  for (const id of [...created.organizations].reverse()) {
    const { error } = await admin.from('organizations').delete().eq('id', id);
    if (error) failures.push('organization_cleanup_failed');
  }
  for (const id of [...created.users].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id, true);
    if (error) failures.push('user_cleanup_failed');
  }

  if (created.memberships.length > 0) {
    const { data, error } = await admin
      .from('organization_members')
      .select('id')
      .in('id', created.memberships);
    if (error || (Array.isArray(data) && data.length > 0)) failures.push('membership_cleanup_not_verified');
  }
  if (created.organizations.length > 0) {
    const { data, error } = await admin
      .from('organizations')
      .select('id')
      .in('id', created.organizations);
    if (error || (Array.isArray(data) && data.length > 0)) failures.push('organization_cleanup_not_verified');
  }
  for (const id of created.users) {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (!error && data?.user) failures.push('user_cleanup_not_verified');
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

    const organizationA = await insertOne(admin, 'organizations', {
      name: `Enterprise Runtime A ${suffix}`,
      slug: `${normalizedPurpose}-a-${suffix}`,
      created_by: owner.id,
    });
    const organizationB = await insertOne(admin, 'organizations', {
      name: `Enterprise Runtime B ${suffix}`,
      slug: `${normalizedPurpose}-b-${suffix}`,
      created_by: outsider.id,
    });
    created.organizations.push(organizationA.id, organizationB.id);

    const ownerMembership = await insertOne(admin, 'organization_members', {
      organization_id: organizationA.id,
      user_id: owner.id,
      role: 'owner',
    });
    const memberMembership = await insertOne(admin, 'organization_members', {
      organization_id: organizationA.id,
      user_id: member.id,
      role: 'member',
    });
    const outsiderMembership = await insertOne(admin, 'organization_members', {
      organization_id: organizationB.id,
      user_id: outsider.id,
      role: 'owner',
    });
    created.memberships.push(ownerMembership.id, memberMembership.id, outsiderMembership.id);

    return {
      created,
      owner,
      member,
      outsider,
      organizationA,
      organizationB,
    };
  } catch (error) {
    const cleanup = await cleanupEphemeralAuthFixtures(admin, created);
    if (!cleanup.verified) {
      throw new Error(`ephemeral_fixture_setup_failed_cleanup_incomplete:${cleanup.failures.join(',')}`);
    }
    throw error;
  }
}
