import { z } from 'zod';

const slugPattern = new RegExp('^[a-z0-9-]+$');

export const organizationRoleSchema = z.enum(['owner', 'admin', 'member']);
export const inviteRoleSchema = z.enum(['admin', 'member']);

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(3).max(80).regex(slugPattern),
});

export const inviteMemberSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: inviteRoleSchema.default('member'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
