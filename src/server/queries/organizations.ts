import { createAdminClient } from '@/lib/supabase/admin';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function listUserOrganizations(userId: string) {
  const supabase = createAdminClient();
  const identityColumn = isUuid(userId) ? 'user_id' : 'clerk_user_id';

  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organization_id, organizations(id, name, slug, created_at, clerk_org_id)')
    .eq(identityColumn, userId)
    .not('organization_id', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
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

export async function getOrganizationBySlug(slug: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at, updated_at, clerk_org_id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getOrganizationByClerkOrgId(clerkOrgId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at, updated_at, clerk_org_id')
    .eq('clerk_org_id', clerkOrgId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
