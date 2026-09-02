import { z } from 'zod';

import { publishLinkedInOrganizationTextPost } from '@/lib/marketing/linkedin';
import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const ROUTE = '/api/internal/marketing/linkedin/publish';
const AUTH_ACTION = 'authenticate_linkedin_marketing_publish';
const MAX_BODY_BYTES = 8 * 1024;
const inputSchema = z.object({
  text: z.string().trim().min(1).max(3000),
});

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
    const body = await readBoundedJsonRequest(request, { maxBytes: MAX_BODY_BYTES });
    const input = inputSchema.parse(body);
    const result = await publishLinkedInOrganizationTextPost({ text: input.text });
    return noStoreJson({ ok: true, postId: result.postId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return noStoreJson({ error: 'invalid_linkedin_post_payload' }, { status: 400 });
    }
    reportError(error, { area: 'linkedin_marketing_publish' });
    return noStoreJson({ error: 'Unable to publish LinkedIn post' }, { status: 502 });
  }
}
