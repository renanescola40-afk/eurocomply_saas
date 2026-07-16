import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { verifyEvidencePackIntegrity, type EvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const MAX_EVIDENCE_PACK_BYTES = 1_000_000;

type EvidencePackExport = {
  payload: unknown;
  integrity: EvidencePackIntegrity;
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

export function isJsonContentType(request: Request) {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.startsWith('application/json') || contentType.includes('+json');
}

export function getEvidencePackContentLength(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return null;

  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function readBoundedUtf8Body(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder('utf-8', { fatal: true });
  let totalBytes = 0;
  let rawBody = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('evidence_pack_body_too_large');
        return null;
      }

      rawBody += decoder.decode(value, { stream: true });
    }

    rawBody += decoder.decode();
    return rawBody;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function readBoundedEvidencePackExport(request: Request): Promise<EvidencePackExport | null> {
  if (!isJsonContentType(request)) {
    return null;
  }

  const contentLength = getEvidencePackContentLength(request);
  if (contentLength !== null && contentLength > MAX_EVIDENCE_PACK_BYTES) {
    return null;
  }

  const rawBody = await readBoundedUtf8Body(request, MAX_EVIDENCE_PACK_BYTES);
  if (rawBody === null) {
    return null;
  }

  const body = JSON.parse(rawBody) as { payload?: unknown; integrity?: unknown };
  if (!body || body.payload === undefined || !isIntegrity(body.integrity)) {
    return null;
  }

  return { payload: body.payload, integrity: body.integrity };
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
    const body = await readBoundedEvidencePackExport(request);

    if (!body) {
      return noStoreJson({ valid: false, error: 'invalid_evidence_pack_export' }, { status: 400 });
    }

    const result = verifyEvidencePackIntegrity({
      payload: body.payload,
      integrity: body.integrity,
    });

    return noStoreJson({
      valid: result.validHash && (result.validSignature ?? true),
      validHash: result.validHash,
      validSignature: result.validSignature,
      signed: result.signed,
      payloadHash: result.payloadHash,
      expectedHash: result.expectedHash,
    });
  } catch (error) {
    reportError(error, { area: 'audit_evidence_pack_verify' });
    return noStoreJson({ valid: false, error: 'verification_failed' }, { status: 400 });
  }
}
