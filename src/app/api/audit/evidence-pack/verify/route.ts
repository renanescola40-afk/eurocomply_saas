import { NextResponse } from 'next/server';

import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { verifyEvidencePackIntegrity, type EvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';

export const runtime = 'nodejs';

type EvidencePackExport = {
  payload?: unknown;
  integrity?: EvidencePackIntegrity;
};

function isIntegrity(value: unknown): value is EvidencePackIntegrity {
  const record = value as Partial<EvidencePackIntegrity> | null;
  return Boolean(
    record &&
      record.schemaVersion === '2026-06-10' &&
      record.algorithm === 'sha256' &&
      typeof record.payloadHash === 'string' &&
      typeof record.signed === 'boolean' &&
      typeof record.generatedAt === 'string',
  );
}

export async function POST(request: Request) {
  const rateLimit = await checkDistributedRateLimit({
    key: `audit-evidence-pack-verify:${request.headers.get('x-forwarded-for') ?? 'unknown'}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = (await request.json()) as EvidencePackExport;

    if (!body || !body.payload || !isIntegrity(body.integrity)) {
      return NextResponse.json({ valid: false, error: 'Invalid evidence pack export format.' }, { status: 400 });
    }

    const result = verifyEvidencePackIntegrity({
      payload: body.payload,
      integrity: body.integrity,
    });

    return NextResponse.json({
      valid: result.validHash && (result.validSignature ?? true),
      validHash: result.validHash,
      validSignature: result.validSignature,
      signed: result.signed,
      payloadHash: result.payloadHash,
      expectedHash: result.expectedHash,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    reportError(error, { area: 'audit_evidence_pack_verify' });
    return NextResponse.json({ valid: false, error: 'Unable to verify evidence pack.' }, { status: 400 });
  }
}
