import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import {
  createReviewerSubmission,
  getReviewerSession,
} from '@/server/queries/qualified-reviewer-portal';
import { parseJsonBodyWithZod, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';

const schema = z.object({
  sessionToken: z.string().regex(/^[a-f0-9]{64}$/),
  targetSha: z.string().regex(/^[a-f0-9]{40}$/),
  opinion: z.string().trim().min(80).max(20000),
  conclusion: z.enum(['accepted', 'accepted_with_conditions', 'changes_required', 'rejected']),
  scope: z.array(z.string().trim().min(3).max(500)).min(1).max(50),
  evidenceLocations: z.array(z.string().trim().min(3).max(1000)).min(1).max(50),
  limitations: z.array(z.string().trim().min(3).max(1000)).max(50),
  validUntil: z.string().datetime({ offset: true }),
});

function denied(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return noStoreJson(
    { error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter },
    { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

async function requireAuthenticatedUser(sessionToken: string) {
  const context = await getReviewerSession(sessionToken);
  if (!context?.session.organization_id) return null;
  return context;
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const body = await parseJsonBodyWithZod(request, { schema, maxBytes: 96 * 1024 });
    if (new Date(body.validUntil) <= new Date()) {
      return noStoreJson({ error: 'review_validity_invalid' }, { status: 400 });
    }

    const limit = await checkDistributedRateLimit({
      key: `qualified-reviewer-submission:${body.sessionToken.slice(0, 16)}`,
      limit: 6,
      windowMs: 60_000,
    });
    if (!limit.allowed) return denied(limit);

    const context = await requireAuthenticatedUser(body.sessionToken);
    if (!context) return noStoreJson({ error: 'reviewer_session_invalid' }, { status: 401 });

    const submission = await createReviewerSubmission(body);
    return noStoreJson({ submission }, { status: 201 });
  } catch (error) {
    return secureApiError(error);
  }
}
