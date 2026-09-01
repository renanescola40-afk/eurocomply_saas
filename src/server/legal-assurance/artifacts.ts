import 'server-only';

import { randomUUID } from 'node:crypto';

import { tryCreateAdminClient } from '@/lib/supabase/admin';

export const LEGAL_ASSURANCE_ARTIFACT_BUCKET = 'legal-assurance-artifacts' as const;
export const LEGAL_ASSURANCE_ARTIFACT_MAX_BYTES = 5 * 1024 * 1024;
export const LEGAL_ASSURANCE_ARTIFACT_SIGNED_URL_SECONDS = 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LegalArtifactRecord = {
  id: string;
  review_id: string;
  decision_id: string | null;
  artifact_reference: string;
  artifact_digest: string;
  artifact_type: string;
  issuer: string;
  issued_at: string;
  created_at: string;
  mime_type: string | null;
  size_bytes: number | null;
  original_filename: string | null;
  uploaded_by_counsel_id: string | null;
};

type StoredLegalArtifactRecord = LegalArtifactRecord & {
  storage_bucket: string;
  storage_path: string;
};

function assertUuid(value: string, label: string) {
  if (!UUID_PATTERN.test(value)) throw new Error(`legal_assurance_invalid_${label}`);
}

function safePdfName(value: string) {
  const base = value.normalize('NFKC').replace(/[^a-zA-Z0-9._ -]+/g, '').trim().slice(0, 160);
  const named = base || 'signed-counsel-artifact.pdf';
  return named.toLowerCase().endsWith('.pdf') ? named : `${named}.pdf`;
}

export function buildLegalArtifactReference(artifactId: string) {
  assertUuid(artifactId, 'artifact_id');
  return `legal-artifact:${artifactId}`;
}

export function buildLegalArtifactStoragePath(input: { organizationId: string; reviewId: string; artifactId: string }) {
  assertUuid(input.organizationId, 'organization_id');
  assertUuid(input.reviewId, 'review_id');
  assertUuid(input.artifactId, 'artifact_id');
  return `${input.organizationId}/${input.reviewId}/${input.artifactId}.pdf`;
}

function unavailable(): never {
  throw new Error('legal_assurance_artifact_storage_unavailable');
}

export async function storeLegalCounselArtifact(input: {
  organizationId: string;
  reviewId: string;
  counselProfileId: string;
  issuer: string;
  originalFilename: string;
  buffer: Buffer;
  digest: string;
  issuedAt?: string;
}) {
  if (input.buffer.byteLength < 1 || input.buffer.byteLength > LEGAL_ASSURANCE_ARTIFACT_MAX_BYTES) {
    throw new Error('legal_assurance_artifact_size_invalid');
  }
  if (!/^[a-f0-9]{64}$/.test(input.digest)) throw new Error('legal_assurance_artifact_digest_invalid');
  assertUuid(input.counselProfileId, 'counsel_profile_id');

  const db = tryCreateAdminClient();
  if (!db) unavailable();

  const artifactId = randomUUID();
  const storagePath = buildLegalArtifactStoragePath({
    organizationId: input.organizationId,
    reviewId: input.reviewId,
    artifactId,
  });
  const originalFilename = safePdfName(input.originalFilename);
  const artifactReference = buildLegalArtifactReference(artifactId);
  const issuedAt = input.issuedAt ?? new Date().toISOString();

  const storage = db.storage.from(LEGAL_ASSURANCE_ARTIFACT_BUCKET);
  const { error: uploadError } = await storage.upload(storagePath, input.buffer, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (uploadError) {
    console.warn('[legal-assurance] artifact_upload_failed', { code: uploadError.message ? 'storage_error' : 'unknown' });
    unavailable();
  }

  const { data, error } = await db
    .from('legal_review_artifacts')
    .insert({
      id: artifactId,
      review_id: input.reviewId,
      artifact_reference: artifactReference,
      artifact_digest: input.digest,
      artifact_type: 'SIGNED_COUNSEL_OPINION',
      issuer: input.issuer,
      issued_at: issuedAt,
      storage_bucket: LEGAL_ASSURANCE_ARTIFACT_BUCKET,
      storage_path: storagePath,
      mime_type: 'application/pdf',
      size_bytes: input.buffer.byteLength,
      original_filename: originalFilename,
      uploaded_by_counsel_id: input.counselProfileId,
    })
    .select('id,review_id,decision_id,artifact_reference,artifact_digest,artifact_type,issuer,issued_at,created_at,mime_type,size_bytes,original_filename,uploaded_by_counsel_id,storage_bucket,storage_path')
    .single();

  if (error || !data) {
    await storage.remove([storagePath]);
    console.warn('[legal-assurance] artifact_metadata_insert_failed', { code: error?.code ?? 'unknown' });
    unavailable();
  }

  return data as StoredLegalArtifactRecord;
}

export async function removeLegalCounselArtifact(artifact: Pick<StoredLegalArtifactRecord, 'id' | 'storage_bucket' | 'storage_path'>) {
  const db = tryCreateAdminClient();
  if (!db) return false;

  const [metadata, object] = await Promise.all([
    db.from('legal_review_artifacts').delete().eq('id', artifact.id),
    db.storage.from(artifact.storage_bucket).remove([artifact.storage_path]),
  ]);
  return !metadata.error && !object.error;
}

export async function getLegalArtifactForDownload(artifactId: string): Promise<StoredLegalArtifactRecord | null> {
  assertUuid(artifactId, 'artifact_id');
  const db = tryCreateAdminClient();
  if (!db) unavailable();

  const { data, error } = await db
    .from('legal_review_artifacts')
    .select('id,review_id,decision_id,artifact_reference,artifact_digest,artifact_type,issuer,issued_at,created_at,mime_type,size_bytes,original_filename,uploaded_by_counsel_id,storage_bucket,storage_path')
    .eq('id', artifactId)
    .maybeSingle();
  if (error) unavailable();
  if (!data) return null;

  const artifact = data as StoredLegalArtifactRecord;
  if (artifact.storage_bucket !== LEGAL_ASSURANCE_ARTIFACT_BUCKET || !artifact.storage_path) unavailable();
  return artifact;
}

export async function createLegalArtifactSignedDownload(artifact: StoredLegalArtifactRecord) {
  const db = tryCreateAdminClient();
  if (!db) unavailable();

  const { data, error } = await db.storage
    .from(artifact.storage_bucket)
    .createSignedUrl(artifact.storage_path, LEGAL_ASSURANCE_ARTIFACT_SIGNED_URL_SECONDS, { download: true });

  if (error || !data?.signedUrl) unavailable();
  return {
    signedUrl: data.signedUrl,
    expiresInSeconds: LEGAL_ASSURANCE_ARTIFACT_SIGNED_URL_SECONDS,
    filename: artifact.original_filename ?? 'signed-counsel-artifact.pdf',
  };
}
