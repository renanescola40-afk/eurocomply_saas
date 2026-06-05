import { describe, expect, it } from 'vitest';
import { createComplianceTaskSchema, updateComplianceTaskSchema } from './compliance';

describe('compliance validation schemas', () => {
  it('defaults new task priority to medium', () => {
    const result = createComplianceTaskSchema.parse({
      organizationId: '00000000-0000-4000-8000-000000000000',
      title: 'Review privacy policy',
    });

    expect(result.priority).toBe('medium');
  });

  it('rejects invalid task status updates', () => {
    expect(updateComplianceTaskSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('accepts nullable assignment and due date updates', () => {
    expect(updateComplianceTaskSchema.safeParse({ assigneeId: null, dueDate: null }).success).toBe(true);
  });
});
