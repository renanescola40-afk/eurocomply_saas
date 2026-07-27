import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { enqueueAccessEscalations, processNextAccessNotification } from '@/server/enterprise/seat-concurrency-alerting';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/enterprise-access-notifications';

async function deliverNotification(input: { channel: string; payload: Record<string, unknown> }) {
  if (input.channel === 'in_app') return;
  // Provider delivery remains adapter-driven and fail-closed. A missing adapter
  // never marks an external notification as delivered.
  throw new Error('notification_provider_not_configured');
}

export async function POST(request: Request) {
  const limited = await enforceInternalAuthenticationRateLimit(request, {
    route: ROUTE,
    action: 'enterprise_access_notification_worker',
  });
  if (limited) return limited;
  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const escalation = await enqueueAccessEscalations();
    const execution = await processNextAccessNotification(deliverNotification);
    return noStoreJson({ ok: true, escalation, execution });
  } catch (error) {
    reportError(error, { area: 'enterprise_access_notifications' });
    return noStoreJson({ error: 'enterprise_access_notifications_unavailable' }, { status: 503 });
  }
}
