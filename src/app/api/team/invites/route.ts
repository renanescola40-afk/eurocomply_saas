import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireEnterprisePlan } from '@/server/queries/subscription';

const allowedRoles = new Set(['Admin', 'Editor', 'Visualizador']);

function isValidEmail(value: unknown) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  try {
    await requireEnterprisePlan(organization.id);
  } catch {
    return NextResponse.json({ error: 'Enterprise plan required' }, { status: 403 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = payload as { email?: unknown; role?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' ? body.role : 'Visualizador';

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid invite email' }, { status: 400 });
  }

  if (!allowedRoles.has(role)) {
    return NextResponse.json({ error: 'Invalid invite role' }, { status: 400 });
  }

  // Security note: this endpoint performs server-side auth, organization lookup and Enterprise plan validation.
  // The current implementation intentionally does not persist an invite until the production invitation schema is ready.
  return NextResponse.json({
    invite: {
      email,
      role,
      organizationId: organization.id,
      status: 'pending',
    },
  });
}
