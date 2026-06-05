import { createOrganizationSchema, type CreateOrganizationInput } from '@/lib/validation/organization';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function createOrganization(input: CreateOrganizationInput, userId: string) {
  const payload = createOrganizationSchema.parse(input);
  const supabase = createSupabaseAdminClient();

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

  await supabase.from('audit_logs').insert({
    organization_id: organization.id,
    actor_user_id: userId,
    action: 'organization.created',
    entity_type: 'organization',
    entity_id: organization.id,
    metadata: { slug: payload.slug },
  });

  return organization;
}
