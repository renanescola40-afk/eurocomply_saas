import { writeAuditLog } from '@/lib/security/audit-log';
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

function normalizeOrganizationName(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length <= 160 ? normalized : fallback;
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
  const safeName = normalizeOrganizationName(input.name, input.slug || input.clerkOrgId);
  const baseSlug = normalizeSlug(input.slug || safeName || input.clerkOrgId);

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
        name: safeName,
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
        name: safeName,
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
            name: safeName,
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
  const { data: existingMembership, error: membershipLookupError } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('organization_id', organization.id)
    .eq('clerk_user_id', input.clerkUserId)
    .maybeSingle();

  if (membershipLookupError) {
    throw new Error(membershipLookupError.message);
  }

  if (existingMembership) {
    const previousRole = existingMembership.role ?? null;
    const { error: updateMembershipError } = await supabase
      .from('organization_members')
      .update({
        clerk_membership_id: input.membershipId ?? null,
        role,
        last_clerk_sync_at: now,
      })
      .eq('id', existingMembership.id);

    if (updateMembershipError) {
      throw new Error(updateMembershipError.message);
    }

    if (previousRole !== role) {
      await writeAuditLog({
        action: 'team.member_role_changed',
        organizationId: organization.id,
        actorUserId: input.clerkUserId,
        entityType: 'organization_member',
        entityId: existingMembership.id,
        metadata: {
          source: 'clerk_organization_sync',
          clerkOrgId: input.clerkOrgId,
          clerkUserId: input.clerkUserId,
          clerkMembershipId: input.membershipId ?? null,
          previousRole,
          nextRole: role,
        },
      });
    }
  } else {
    const { error: insertMembershipError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: null,
        clerk_user_id: input.clerkUserId,
        clerk_membership_id: input.membershipId ?? null,
        role,
        last_clerk_sync_at: now,
      });

    if (insertMembershipError) {
      throw new Error(insertMembershipError.message);
    }
  }

  return {
    id: organization.id,
    slug: organization.slug,
    clerkOrgId: input.clerkOrgId,
    role,
  };
}
