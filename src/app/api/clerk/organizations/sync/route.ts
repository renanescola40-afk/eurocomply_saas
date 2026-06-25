import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { syncClerkOrganizationToSupabase } from '@/server/clerk/organization-sync';

export async function POST(request: Request) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    clerkOrgId?: string;
    name?: string;
    slug?: string | null;
    membershipId?: string | null;
  } | null;

  if (!body?.clerkOrgId || body.clerkOrgId !== orgId || !body.name) {
    return NextResponse.json({ error: 'Invalid organization payload' }, { status: 400 });
  }

  const organization = await syncClerkOrganizationToSupabase({
    clerkOrgId: body.clerkOrgId,
    clerkUserId: userId,
    name: body.name,
    slug: body.slug,
    role: orgRole,
    membershipId: body.membershipId,
  });

  return NextResponse.json({ organization });
}
