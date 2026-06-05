import { createAdminClient } from '@/lib/supabase/admin';

export async function listUserOrganizations(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, slug, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getOrganizationBySlug(slug: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
