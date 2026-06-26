import { auth, currentUser } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function isSupabaseRuntimeConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

type CurrentAppUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  source: 'clerk' | 'supabase';
};

export async function getCurrentUser(): Promise<CurrentAppUser | null> {
  try {
    const clerkAuth = await auth();

    if (clerkAuth.userId) {
      const clerkUser = await currentUser().catch(() => null);
      const primaryEmail = clerkUser?.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress
        ?? clerkUser?.emailAddresses[0]?.emailAddress
        ?? null;

      return {
        id: clerkAuth.userId,
        email: primaryEmail,
        firstName: clerkUser?.firstName ?? null,
        lastName: clerkUser?.lastName ?? null,
        imageUrl: clerkUser?.imageUrl ?? null,
        source: 'clerk',
      };
    }
  } catch {
    // Fall through to Supabase legacy auth below.
  }

  if (!isSupabaseRuntimeConfigured()) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
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
