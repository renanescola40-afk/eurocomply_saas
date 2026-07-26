import { z } from 'zod';

import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { captureAccessRuntimeForOrganization } from '@/server/enterprise/access-runtime-slo';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/enterprise-access-runtime';
const AUTH_ACTION = 'authenticate_enterprise_access_runtime';
const MAX_BODY_BYTES = 8 * 1024;
const inputSchema = z.object({
  organizationId: z.string().uuid(),
  windowMinutes: z.number().int().min(5).max(1440).optional(),
});

export async function POST(request: Request) {
  const limited = await enforceInternalAuthenticationRateLimit(request, {
    route: ROUTE,
    action: AUTH_ACTION,
  });
  if (limited) return limited;
  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await readBoundedJsonRequest(request, { maxBytes: MAX_BODY_BYTES });
    const input = inputSchema.parse(body);
    const runtimeState = await captureAccessRuntimeForOrganization(
      input.organizationId,
      input.windowMinutes,
    );
    return noStoreJson({ ok: true, runtime: runtimeState });
  } catch (error) {
    if (error instanceof z.ZodError) return noStoreJson({ error: 'invalid_request' }, { status: 400 });
    reportError(error, { area: 'enterprise_access_runtime' });
    return noStoreJson({ error: 'enterprise_access_runtime_unavailable' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
