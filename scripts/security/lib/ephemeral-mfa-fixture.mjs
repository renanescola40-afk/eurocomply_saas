import { randomBytes, randomUUID } from 'node:crypto';

function disposablePassword() {
  return `Rc!${randomBytes(24).toString('base64url')}9a`;
}

export async function createEphemeralMfaUser(admin, { purpose = 'step-up-mfa-proof' } = {}) {
  const suffix = `${Date.now()}-${randomUUID()}`;
  const email = `${purpose}-${suffix}@example.com`;
  const password = disposablePassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose },
  });
  if (error || !data.user?.id) throw new Error('ephemeral_mfa_user_create_failed');
  return { id: data.user.id, email, password };
}

export async function cleanupEphemeralMfaUser(admin, userId) {
  if (!userId) return { verified: false, failure: 'ephemeral_mfa_user_id_missing' };
  const deletion = await admin.auth.admin.deleteUser(userId, true);
  if (deletion.error) return { verified: false, failure: 'ephemeral_mfa_user_delete_failed' };

  const lookup = await admin.auth.admin.getUserById(userId);
  const notFound = Number(lookup.error?.status || 0) === 404
    || /not found/i.test(String(lookup.error?.message || ''))
    || !lookup.data?.user;
  return notFound
    ? { verified: true, failure: null }
    : { verified: false, failure: 'ephemeral_mfa_user_cleanup_not_verified' };
}
