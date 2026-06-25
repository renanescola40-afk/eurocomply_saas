import { createAdminClient } from '@/lib/supabase/admin';

type SyncClerkOrganizationInput = {
  clerkOrgId: string;
  clerkUserId: string;
  name: string;
  slug?: string | null;
  role?: string | null;
  membershipId?: string | null;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'organization';
}

function clerkRoleToAppRole(role?: string | null) {
  if (!role) return 'member';
  const normalized = role.replace(/^org:/, '').toLowerCase();

  if (['owner', 'admin', 'member', 'viewer'].includes(normalized)) {
    return normalized;
  }

  return 'member';
}

export async function syncClerkOrganizationToSupabase(input: SyncClerkOrganizationInput) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const baseSlug = normalizeSlug(input.slug || input.name || input.clerkOrgId);

  const { data: existingByClerkOrgId, error: lookupError } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('clerk_org_id', input.clerkOrgId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  let organization = existingByClerkOrgId;

  if (organization) {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        name: input.name,
        clerk_org_id: input.clerkOrgId,
        created_by_clerk_user_id: input.clerkUserId,
        last_clerk_sync_at: now,
        updated_at: now,
      })
      .eq('id', organization.id)
      .select('id, slug')
      .single();

    if (error) throw new Error(error.message);
    organization = data;
  } else {
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: input.name,
        slug: baseSlug,
        clerk_org_id: input.clerkOrgId,
        created_by: null,
        created_by_clerk_user_id: input.clerkUserId,
        last_clerk_sync_at: now,
      })
      .select('id, slug')
      .single();

    if (error) {
      if (error.code === '23505') {
        const fallbackSlug = `${baseSlug}-${input.clerkOrgId.slice(-8).toLowerCase()}`;
        const fallback = await supabase
          .from('organizations')
          .insert({
            name: input.name,
            slug: fallbackSlug,
            clerk_org_id: input.clerkOrgId,
            created_by: null,
            created_by_clerk_user_id: input.clerkUserId,
            last_clerk_sync_at: now,
          })
          .select('id, slug')
          .single();

        if (fallback.error) throw new Error(fallback.error.message);
        organization = fallback.data;
      } else {
        throw new Error(error.message);
      }
    } else {
      organization = data;
    }
  }

  const role = clerkRoleToAppRole(input.role);

  const { error: membershipError } = await supabase
    .from('organization_members')
    .upsert(
      {
        organization_id: organization.id,
        user_id: null,
        clerk_user_id: input.clerkUserId,
        clerk_membership_id: input.membershipId ?? null,
        role,
        last_clerk_sync_at: now,
      },
      { onConflict: 'organization_id,clerk_user_id' },
    );

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  return {
    id: organization.id,
    slug: organization.slug,
    clerkOrgId: input.clerkOrgId,
    role,
  };
}
