import { auth, currentUser } from '@clerk/nextjs/server';

type CurrentAppUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  source: 'clerk';
  clerkUserId: string;
  supabaseUserId?: null;
};

export async function getCurrentUser(): Promise<CurrentAppUser | null> {
  try {
    const clerkAuth = await auth();

    if (!clerkAuth.userId) {
      return null;
    }

    const clerkUser = await currentUser().catch(() => null);
    const primaryEmail = clerkUser?.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress
      ?? clerkUser?.emailAddresses[0]?.emailAddress
      ?? null;

    return {
      id: clerkAuth.userId,
      clerkUserId: clerkAuth.userId,
      supabaseUserId: null,
      email: primaryEmail,
      firstName: clerkUser?.firstName ?? null,
      lastName: clerkUser?.lastName ?? null,
      imageUrl: clerkUser?.imageUrl ?? null,
      source: 'clerk',
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
