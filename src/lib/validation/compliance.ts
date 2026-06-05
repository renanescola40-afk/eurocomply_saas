import { z } from 'zod';

export const complianceTaskStatusSchema = z.enum(['todo', 'in_progress', 'blocked', 'done']);
export const prioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const createComplianceTaskSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  priority: prioritySchema.default('medium'),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const updateComplianceTaskSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  priority: prioritySchema.optional(),
  status: complianceTaskStatusSchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export type CreateComplianceTaskInput = z.infer<typeof createComplianceTaskSchema>;
export type UpdateComplianceTaskInput = z.infer<typeof updateComplianceTaskSchema>;
