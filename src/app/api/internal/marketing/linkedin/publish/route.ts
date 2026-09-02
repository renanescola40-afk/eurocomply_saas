import { publishLinkedInOrganizationTextPost } from '@/lib/marketing/linkedin';
import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/marketing/linkedin/publish';
const AUTH_ACTION = 'authenticate_linkedin_marketing_publish';

export async function POST(request: Request) {
  const rateLimited = await enforceInternalAuthenticationRateLimit(request, {
    route: ROUTE,
    action: AUTH_ACTION,
  });
  if (rateLimited) return rateLimited;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { text?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return noStoreJson({ error: 'Post text is required' }, { status: 400 });
    }

    const result = await publishLinkedInOrganizationTextPost({ text });
    return noStoreJson({ ok: true, postId: result.postId }, { status: 201 });
  } catch (error) {
    reportError(error, { area: 'linkedin_marketing_publish' });
    return noStoreJson({ error: 'Unable to publish LinkedIn post' }, { status: 502 });
  }
}
