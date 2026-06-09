import { z } from 'zod';

export const complianceTaskStatusSchema = z.enum(['todo', 'in_progress', 'blocked', 'done']);
export const prioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

const dateInputSchema = z.string().refine(
  (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)),
  'Invalid date',
);

export const createComplianceTaskSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  priority: prioritySchema.default('medium'),
  dueDate: dateInputSchema.optional(),
  assigneeId: z.string().uuid().optional(),
});

export const updateComplianceTaskSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  priority: prioritySchema.optional(),
  status: complianceTaskStatusSchema.optional(),
  dueDate: dateInputSchema.nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export type CreateComplianceTaskInput = z.infer<typeof createComplianceTaskSchema>;
export type UpdateComplianceTaskInput = z.infer<typeof updateComplianceTaskSchema>;
