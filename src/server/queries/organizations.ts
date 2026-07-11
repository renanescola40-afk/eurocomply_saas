import { createAdminClient } from '@/lib/supabase/admin';

export async function listUserOrganizations(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organization_id, organizations(id, name, slug, created_at)')
    .eq('user_id', userId)
    .not('organization_id', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[organizations] list_for_user_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load organizations.');
  }

  return data ?? [];
}

export async function getCurrentOrganizationForUser(userId: string) {
  const memberships = await listUserOrganizations(userId);
  const firstMembership = memberships[0];
  const organization = firstMembership?.organizations;

  if (Array.isArray(organization)) {
    return organization[0] ?? null;
  }

  return organization ?? null;
}
