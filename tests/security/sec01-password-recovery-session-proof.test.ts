import { afterEach, describe, expect, it } from 'vitest';
import {
  hasObservedPasswordRecoverySession,
  observeRecoveryAuthEvent,
} from '@/lib/auth/recovery-session-proof';

const alice = { user: { id: 'synthetic-alice' }, access_token: 'synthetic-recovery-token' };
const aliceRefresh = { user: { id: 'synthetic-alice' }, access_token: 'synthetic-refreshed-token' };
const bob = { user: { id: 'synthetic-bob' }, access_token: 'synthetic-other-token' };

afterEach(() => {
  observeRecoveryAuthEvent('SIGNED_OUT', null);
});

describe('SEC-01 account-recovery event provenance', () => {
  it('does not mistake a normal, pre-existing login session for recovery', () => {
    observeRecoveryAuthEvent('INITIAL_SESSION', alice);
    expect(hasObservedPasswordRecoverySession(alice)).toBe(false);
    observeRecoveryAuthEvent('SIGNED_IN', alice);
    expect(hasObservedPasswordRecoverySession(alice)).toBe(false);
  });

  it('accepts only an SDK PASSWORD_RECOVERY session for that exact identity and token', () => {
    observeRecoveryAuthEvent('PASSWORD_RECOVERY', alice);
    expect(hasObservedPasswordRecoverySession(alice)).toBe(true);
    expect(hasObservedPasswordRecoverySession(aliceRefresh)).toBe(false);
    expect(hasObservedPasswordRecoverySession(bob)).toBe(false);
  });

  it('keeps a genuine recovery session through a same-user token refresh', () => {
    observeRecoveryAuthEvent('PASSWORD_RECOVERY', alice);
    observeRecoveryAuthEvent('TOKEN_REFRESHED', aliceRefresh);
    expect(hasObservedPasswordRecoverySession(alice)).toBe(false);
    expect(hasObservedPasswordRecoverySession(aliceRefresh)).toBe(true);
  });

  it('rejects a different-user token refresh and fails closed on missing sessions', () => {
    observeRecoveryAuthEvent('PASSWORD_RECOVERY', alice);
    observeRecoveryAuthEvent('TOKEN_REFRESHED', bob);
    expect(hasObservedPasswordRecoverySession(alice)).toBe(false);
    expect(hasObservedPasswordRecoverySession(bob)).toBe(false);
    observeRecoveryAuthEvent('PASSWORD_RECOVERY', null);
    expect(hasObservedPasswordRecoverySession(alice)).toBe(false);
  });

  it('clears recovery provenance on ordinary login and global sign-out', () => {
    observeRecoveryAuthEvent('PASSWORD_RECOVERY', alice);
    observeRecoveryAuthEvent('SIGNED_IN', alice);
    expect(hasObservedPasswordRecoverySession(alice)).toBe(false);
    observeRecoveryAuthEvent('PASSWORD_RECOVERY', alice);
    observeRecoveryAuthEvent('SIGNED_OUT', null);
    expect(hasObservedPasswordRecoverySession(alice)).toBe(false);
  });
});
