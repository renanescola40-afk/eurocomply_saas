import { clerkClient } from '@clerk/nextjs/server';

import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';

type ClerkEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
};

type ClerkUserLike = {
  primaryEmailAddressId?: string | null;
  emailAddresses?: ClerkEmailAddress[];
};

function getPrimaryClerkEmail(user: ClerkUserLike | null | undefined) {
  const emailAddresses = user?.emailAddresses ?? [];
  const primary = emailAddresses.find((email) => email.id && email.id === user?.primaryEmailAddressId);
  return primary?.emailAddress ?? emailAddresses[0]?.emailAddress ?? null;
}

async function getClerkUserEmail(userId: string, area: string) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId) as ClerkUserLike;
    return getPrimaryClerkEmail(user);
  } catch (error) {
    reportError(error, { area: `${area}_clerk_lookup`, userId });
    return null;
  }
}

async function getLegacySupabaseUserEmail(userId: string, area: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      reportError(error, { area: `${area}_legacy_lookup`, userId });
      return null;
    }

    return data.user?.email ?? null;
  } catch (error) {
    reportError(error, { area: `${area}_legacy_lookup`, userId });
    return null;
  }
}

export async function getUserEmailById(userId: string, area = 'user_email_lookup') {
  const clerkEmail = await getClerkUserEmail(userId, area);
  if (clerkEmail) return clerkEmail;

  return getLegacySupabaseUserEmail(userId, area);
}
