import { describe, expect, it } from 'vitest';
import { createComplianceTaskSchema, updateComplianceTaskSchema } from './compliance';
import { createOrganizationSchema, inviteMemberSchema } from './organization';

const organizationId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

describe('organization validation schemas', () => {
  it('accepts valid organization names and slugs', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Acme Compliance',
      slug: 'acme-compliance',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid organization slugs', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Acme Compliance',
      slug: 'Acme Compliance!',
    });

    expect(result.success).toBe(false);
  });

  it('defaults invited members to the member role', () => {
    const result = inviteMemberSchema.parse({
      organizationId,
      email: 'member@example.com',
    });

    expect(result.role).toBe('member');
  });
});

describe('compliance task validation schemas', () => {
  it('accepts a valid compliance task and defaults priority', () => {
    const result = createComplianceTaskSchema.parse({
      organizationId,
      title: 'Review privacy policy',
    });

    expect(result.priority).toBe('medium');
  });

  it('rejects invalid task status updates', () => {
    const result = updateComplianceTaskSchema.safeParse({
      status: 'archived',
    });

    expect(result.success).toBe(false);
  });

  it('accepts nullable assignee and due date on updates', () => {
    const result = updateComplianceTaskSchema.safeParse({
      assigneeId: null,
      dueDate: null,
      status: 'blocked',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a valid assignee id on creation', () => {
    const result = createComplianceTaskSchema.safeParse({
      organizationId,
      title: 'Collect DPIA evidence',
      assigneeId: userId,
      priority: 'high',
      dueDate: new Date('2026-12-31T12:00:00.000Z').toISOString(),
    });

    expect(result.success).toBe(true);
  });
});
