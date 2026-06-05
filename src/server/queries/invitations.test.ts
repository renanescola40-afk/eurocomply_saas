import { describe, expect, it } from 'vitest';
import { canAcceptInvitation, isInvitationExpired } from './invitations';

describe('invitation query helpers', () => {
  it('detects expired invitations', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    expect(isInvitationExpired(yesterday)).toBe(true);
  });

  it('allows active pending invitations', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    expect(canAcceptInvitation({ accepted_at: null, expires_at: tomorrow })).toBe(true);
  });

  it('rejects accepted invitations', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    expect(canAcceptInvitation({ accepted_at: new Date().toISOString(), expires_at: tomorrow })).toBe(false);
  });
});
