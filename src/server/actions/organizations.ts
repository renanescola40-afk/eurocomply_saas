import { createAdminClient } from '@/lib/supabase/admin';
import { createOrganizationSchema, type CreateOrganizationInput } from '@/lib/validation/organization';
import { logAuditEvent } from './audit';

export async function createOrganization(input: CreateOrganizationInput, userId: string) {
  const payload = createOrganizationSchema.parse(input);
  const supabase = createAdminClient();

  const { data: organization, error } = await supabase
    .from('organizations')
    .insert({ name: payload.name, slug: payload.slug, created_by: userId })
    .select('*')
    .single();

  if (error) throw error;

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: organization.id,
    user_id: userId,
    role: 'owner',
  });

  if (memberError) throw memberError;

  await logAuditEvent({
    organizationId: organization.id,
    actorUserId: userId,
    action: 'organization.created',
    entityType: 'organization',
    entityId: organization.id,
    metadata: { slug: payload.slug },
  });

  return organization;
}
