import { describe, expect, it } from 'vitest';
import { createOrganizationSchema, inviteMemberSchema } from './organization';

describe('organization validation schemas', () => {
  it('accepts valid organization payloads', () => {
    expect(createOrganizationSchema.safeParse({ name: 'Acme Ltd', slug: 'acme-ltd' }).success).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(createOrganizationSchema.safeParse({ name: 'Acme Ltd', slug: 'Acme Ltd' }).success).toBe(false);
  });

  it('defaults invite role to member', () => {
    const result = inviteMemberSchema.parse({
      organizationId: '00000000-0000-4000-8000-000000000000',
      email: 'user@example.com',
    });

    expect(result.role).toBe('member');
  });
});
