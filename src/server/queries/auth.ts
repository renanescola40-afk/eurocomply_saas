import { createServerSupabaseClient } from '@/lib/supabase/server';

type CurrentAppUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  source: 'supabase';
  supabaseUserId: string;
};

function readMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function getCurrentUser(): Promise<CurrentAppUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    const metadata = data.user.user_metadata ?? {};
    const fullName = readMetadataString(metadata, 'full_name') ?? readMetadataString(metadata, 'name');
    const nameParts = fullName?.split(/\s+/).filter(Boolean) ?? [];
    const inferredLastName = nameParts.slice(1).join(' ') || null;

    return {
      id: data.user.id,
      supabaseUserId: data.user.id,
      email: data.user.email ?? null,
      firstName: readMetadataString(metadata, 'first_name') ?? nameParts[0] ?? null,
      lastName: readMetadataString(metadata, 'last_name') ?? inferredLastName,
      imageUrl: readMetadataString(metadata, 'avatar_url') ?? readMetadataString(metadata, 'picture'),
      source: 'supabase',
    };
  } catch {
    return null;
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}
