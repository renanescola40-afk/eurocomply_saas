import { inspectLinkedInMarketingConnection } from '@/lib/marketing/linkedin-connection';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

export const runtime = 'nodejs';

const ROUTE = '/api/platform/marketing/linkedin/status';

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const rateLimit = await checkDistributedRateLimit({
      key: `platform-linkedin-status:${user.id}:${getClientIp(request)}`,
      policy: 'general-api',
      userId: user.id,
      organizationId: null,
      route: ROUTE,
      action: 'linkedin_marketing.connection_status',
      limit: 10,
      windowMs: 5 * 60_000,
      failureMode: 'fail-closed',
    });

    if (!rateLimit.allowed) {
      return noStoreJson(
        { error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded' },
        { status: rateLimit.reason ? 503 : 429 },
      );
    }

    await requirePlatformCapability(user.id, 'security');

    const connection = await inspectLinkedInMarketingConnection();
    return noStoreJson(connection);
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}
