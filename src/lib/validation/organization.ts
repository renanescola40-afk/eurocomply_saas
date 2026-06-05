import { z } from 'zod';

export const organizationRoleSchema = z.enum(['owner', 'admin', 'compliance_manager', 'member', 'viewer']);

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
});

export const inviteMemberSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: organizationRoleSchema.default('member'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
