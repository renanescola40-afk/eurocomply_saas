import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireEnterprisePlan } from '@/server/queries/subscription';
import { createOrganizationInvite } from '@/server/queries/invites';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';

const allowedRoles = new Set(['Admin', 'Editor', 'Visualizador']);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const inviteAttempts = new Map<string, { count: number; resetAt: number }>();

function isValidEmail(value: unknown) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = inviteAttempts.get(key);

  if (!current || current.resetAt <= now) {
    inviteAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return true;
  }

  current.count += 1;
  inviteAttempts.set(key, current);
  return false;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientIp = getClientIp(request);
  const rateLimitKey = `${user.id}:${clientIp}`;

  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: 'Too many invite attempts. Please wait before trying again.' },
      { status: 429 },
    );
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  try {
    await requireEnterprisePlan(organization.id);
  } catch {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'enterprise_invite_blocked',
      entityType: 'team_invite',
      metadata: { reason: 'enterprise_required' },
    });

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

  const result = await createOrganizationInvite({
    organizationId: organization.id,
    invitedBy: user.id,
    email,
    role: role as 'Admin' | 'Editor' | 'Visualizador',
  });

  const audit = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'team_invite_created',
    entityType: 'team_invite',
    entityId: result.invite.id,
    metadata: {
      emailDomain: email.split('@')[1] ?? 'unknown',
      role,
      persisted: result.persisted,
    },
  });

  const notification = await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'invite',
    message: `Convite enviado para ${email} com permissão ${role}.`,
  });

  return NextResponse.json({
    invite: result.invite,
    persisted: result.persisted,
    auditPersisted: audit.persisted,
    notificationPersisted: notification.persisted,
  });
}
