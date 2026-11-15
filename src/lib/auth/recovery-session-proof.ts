/**
 * Browser-only, in-memory recovery-event provenance.
 *
 * An ordinary authenticated Supabase session is NOT evidence of a password
 * recovery link. This marker is set only by the SDK's PASSWORD_RECOVERY event.
 * The token is never persisted, sent to logs or treated as server authority:
 * Supabase Auth still validates updateUser({ password }) on the network.
 */
export type RecoveryAuthSession = {
  access_token?: string | null;
  user?: { id?: string | null } | null;
} | null;

type RecoveryProof = { userId: string; accessToken: string };
let observedRecovery: RecoveryProof | null = null;

function proofFromSession(session: RecoveryAuthSession): RecoveryProof | null {
  const userId = session?.user?.id;
  const accessToken = session?.access_token;
  return typeof userId === 'string' && userId.length > 0 &&
    typeof accessToken === 'string' && accessToken.length > 0
    ? { userId, accessToken } : null;
}

export function observeRecoveryAuthEvent(event: string, session: RecoveryAuthSession): void {
  if (event === 'PASSWORD_RECOVERY') {
    observedRecovery = proofFromSession(session);
    return;
  }

  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
    observedRecovery = null;
    return;
  }

  if (event === 'TOKEN_REFRESHED' && observedRecovery) {
    const refreshed = proofFromSession(session);
    observedRecovery = refreshed?.userId === observedRecovery.userId ? refreshed : null;
  }
}

export function hasObservedPasswordRecoverySession(session: RecoveryAuthSession): boolean {
  const current = proofFromSession(session);
  return Boolean(
    current && observedRecovery &&
    current.userId === observedRecovery.userId &&
    current.accessToken === observedRecovery.accessToken
  );
}
