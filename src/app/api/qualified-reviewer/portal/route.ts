import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import {
  acceptReviewerInvite,
  getReviewerSession,
  revokeReviewerSession,
  saveReviewerAttestation,
} from '@/server/queries/qualified-reviewer-portal';
import { parseJsonBodyWithZod, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';

const workflows = ['accept_invite', 'attest', 'logout'] as const;
type Workflow = (typeof workflows)[number];

const acceptSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
const attestationSchema = z.object({
  sessionToken: z.string().regex(/^[a-f0-9]{64}$/),
  independenceConfirmed: z.boolean(),
  conflictDetails: z.string().trim().max(4000).nullable().optional(),
  scopeAcknowledged: z.literal(true),
}).superRefine((value, ctx) => {
  if (value.independenceConfirmed && value.conflictDetails?.trim()) {
    ctx.addIssue({ code: 'custom', message: 'conflict_requires_reassignment', path: ['conflictDetails'] });
  }
});
const logoutSchema = z.object({ sessionToken: z.string().regex(/^[a-f0-9]{64}$/) });

function workflowOf(request: Request): Workflow | null {
  const value = new URL(request.url).searchParams.get('workflow');
  return workflows.includes(value as Workflow) ? value as Workflow : null;
}

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

export async function GET(request: Request) {
  try {
    const sessionToken = request.headers.get('x-qualified-review-session') ?? '';
    if (!/^[a-f0-9]{64}$/.test(sessionToken)) {
      return noStoreJson({ error: 'reviewer_session_required' }, { status: 401 });
    }
    const limit = await checkDistributedRateLimit({
      key: `qualified-reviewer-portal:get:${sessionToken.slice(0, 16)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.allowed) return denied(limit);
    const context = await requireAuthenticatedUser(sessionToken);
    if (!context) return noStoreJson({ error: 'reviewer_session_invalid' }, { status: 401 });
    return noStoreJson({ ...context, humanReviewRequired: true });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;
    const workflow = workflowOf(request);
    if (!workflow) return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });
    const limit = await checkDistributedRateLimit({
      key: `qualified-reviewer-portal:${workflow}:${request.headers.get('x-forwarded-for') ?? 'unknown'}`,
      limit: workflow === 'accept_invite' ? 8 : 20,
      windowMs: 60_000,
    });
    if (!limit.allowed) return denied(limit);

    if (workflow === 'accept_invite') {
      const body = await parseJsonBodyWithZod(request, { schema: acceptSchema, maxBytes: 8 * 1024 });
      const accepted = await acceptReviewerInvite(body.token);
      return noStoreJson({ sessionToken: accepted.sessionToken, expiresAt: accepted.expiresAt, context: accepted.context });
    }

    if (workflow === 'attest') {
      const body = await parseJsonBodyWithZod(request, { schema: attestationSchema, maxBytes: 16 * 1024 });
      const context = await requireAuthenticatedUser(body.sessionToken);
      if (!context) return noStoreJson({ error: 'reviewer_session_invalid' }, { status: 401 });
      const attestation = await saveReviewerAttestation(body);
      return noStoreJson({ attestation });
    }

    const body = await parseJsonBodyWithZod(request, { schema: logoutSchema, maxBytes: 8 * 1024 });
    const context = await requireAuthenticatedUser(body.sessionToken);
    if (!context) return noStoreJson({ error: 'reviewer_session_invalid' }, { status: 401 });
    await revokeReviewerSession(body.sessionToken);
    return noStoreJson({ ok: true });
  } catch (error) {
    return secureApiError(error);
  }
}
