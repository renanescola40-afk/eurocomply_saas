import { describe, expect, it } from 'vitest';
import { inviteMemberSchema, inviteRoleSchema, organizationRoleSchema } from '@/lib/validation/organization';

describe('organization role validation', () => {
  it('supports only owner, admin and member as organization roles', () => {
    expect(organizationRoleSchema.safeParse('owner').success).toBe(true);
    expect(organizationRoleSchema.safeParse('admin').success).toBe(true);
    expect(organizationRoleSchema.safeParse('member').success).toBe(true);
    expect(organizationRoleSchema.safeParse('viewer').success).toBe(false);
    expect(organizationRoleSchema.safeParse('compliance_manager').success).toBe(false);
  });

  it('allows invitations only for admin and member roles', () => {
    expect(inviteRoleSchema.safeParse('admin').success).toBe(true);
    expect(inviteRoleSchema.safeParse('member').success).toBe(true);
    expect(inviteRoleSchema.safeParse('owner').success).toBe(false);
    expect(inviteRoleSchema.safeParse('viewer').success).toBe(false);
    expect(inviteRoleSchema.safeParse('compliance_manager').success).toBe(false);
  });

  it('defaults invitations to member when role is omitted', () => {
    const result = inviteMemberSchema.parse({
      organizationId: '00000000-0000-4000-8000-000000000000',
      email: 'person@example.com',
    });

    expect(result.role).toBe('member');
  });

  it('rejects invalid invitation payloads', () => {
    expect(() => inviteMemberSchema.parse({ organizationId: 'not-a-uuid', email: 'person@example.com', role: 'member' })).toThrow();
    expect(() => inviteMemberSchema.parse({ organizationId: '00000000-0000-4000-8000-000000000000', email: 'bad-email', role: 'member' })).toThrow();
    expect(() => inviteMemberSchema.parse({ organizationId: '00000000-0000-4000-8000-000000000000', email: 'person@example.com', role: 'viewer' })).toThrow();
  });
});
