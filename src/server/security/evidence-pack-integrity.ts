import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type EvidencePackIntegrity = {
  schemaVersion: '2026-06-10';
  algorithm: 'sha256';
  payloadHash: string;
  signed: boolean;
  hmacAlgorithm?: 'hmac-sha256';
  signature?: string;
  generatedAt: string;
};

export type IntegrityVerificationResult = {
  validHash: boolean;
  validSignature: boolean | null;
  signed: boolean;
  payloadHash: string;
  expectedHash?: string;
};

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortJson((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(sortJson(value));
}

export function sha256Hex(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function getSigningSecret() {
  return process.env.EVIDENCE_PACK_SIGNING_SECRET?.trim() || process.env.HEALTHCHECK_TOKEN?.trim() || null;
}

function hmacSha256Hex(value: string, secret: string) {
  return createHmac('sha256', secret).update(value, 'utf8').digest('hex');
}

export function buildEvidencePackIntegrity(payload: unknown): EvidencePackIntegrity {
  const canonicalPayload = canonicalJson(payload);
  const payloadHash = sha256Hex(canonicalPayload);
  const secret = getSigningSecret();

  if (!secret) {
    return {
      schemaVersion: '2026-06-10',
      algorithm: 'sha256',
      payloadHash,
      signed: false,
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    schemaVersion: '2026-06-10',
    algorithm: 'sha256',
    payloadHash,
    signed: true,
    hmacAlgorithm: 'hmac-sha256',
    signature: hmacSha256Hex(payloadHash, secret),
    generatedAt: new Date().toISOString(),
  };
}

function safeEqualHex(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyEvidencePackIntegrity({
  payload,
  integrity,
}: {
  payload: unknown;
  integrity: EvidencePackIntegrity;
}): IntegrityVerificationResult {
  const payloadHash = sha256Hex(canonicalJson(payload));
  const validHash = safeEqualHex(payloadHash, integrity.payloadHash);
  const secret = getSigningSecret();

  if (!integrity.signed || !integrity.signature || !secret) {
    return {
      validHash,
      validSignature: integrity.signed ? false : null,
      signed: integrity.signed,
      payloadHash,
      expectedHash: integrity.payloadHash,
    };
  }

  const expectedSignature = hmacSha256Hex(integrity.payloadHash, secret);

  return {
    validHash,
    validSignature: safeEqualHex(expectedSignature, integrity.signature),
    signed: true,
    payloadHash,
    expectedHash: integrity.payloadHash,
  };
}
