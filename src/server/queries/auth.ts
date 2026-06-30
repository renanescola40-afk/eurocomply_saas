import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type CurrentAppUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  source: 'supabase';
  clerkUserId?: null;
  supabaseUserId: string;
};

function getPublicSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return supabaseUrl && supabaseKey ? { supabaseUrl, supabaseKey } : null;
}

function normalizeName(metadata: Record<string, unknown>) {
  const fullName = typeof metadata.full_name === 'string'
    ? metadata.full_name
    : typeof metadata.name === 'string'
      ? metadata.name
      : null;
  const parts = fullName?.split(/\s+/).filter(Boolean) ?? [];
  return {
    firstName: typeof metadata.first_name === 'string' ? metadata.first_name : parts[0] ?? null,
    lastName: typeof metadata.last_name === 'string' ? metadata.last_name : parts.slice(1).join(' ') || null,
    imageUrl: typeof metadata.avatar_url === 'string'
      ? metadata.avatar_url
      : typeof metadata.picture === 'string'
        ? metadata.picture
        : null,
  };
}

export async function getCurrentUser(): Promise<CurrentAppUser | null> {
  const config = getPublicSupabaseConfig();
  if (!config) return null;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(config.supabaseUrl, config.supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot always mutate cookies; middleware refreshes them when possible.
          }
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const metadata = data.user.user_metadata ?? {};
    const name = normalizeName(metadata);

    return {
      id: data.user.id,
      supabaseUserId: data.user.id,
      clerkUserId: null,
      email: data.user.email ?? null,
      firstName: name.firstName,
      lastName: name.lastName,
      imageUrl: name.imageUrl,
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
