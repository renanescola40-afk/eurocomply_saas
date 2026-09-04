import { supabase } from '@/integrations/supabase/client';

export type EvidenceStatus = 'draft' | 'valid' | 'needs_review' | 'expired' | 'archived';
export type EvidenceType =
  | 'policy'
  | 'procedure'
  | 'risk_assessment'
  | 'training'
  | 'vendor_review'
  | 'technical_documentation'
  | 'log'
  | 'document'
  | 'other';

export type EvidenceItem = {
  id: string;
  organization_id: string;
  workspace_id?: string | null;
  user_id: string;
  finding_id?: string | null;
  task_id?: string | null;
  title: string;
  description?: string | null;
  evidence_type: EvidenceType;
  status: EvidenceStatus;
  article_refs: string[];
  owner_name?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  file_mime_type?: string | null;
  storage_bucket: 'compliance-evidence';
  storage_object_path?: string | null;
  file_sha256?: string | null;
  file_size_bytes?: number | null;
  deleted_at?: string | null;
  deleted_by_subject?: string | null;
  delete_reason?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type EvidenceInput = {
  organizationId: string;
  findingId?: string | null;
  taskId?: string | null;
  title: string;
  description?: string;
  evidenceType?: EvidenceType;
  status?: EvidenceStatus;
  articleRefs?: string[];
  ownerName?: string;
  expiresAt?: string | null;
  /** @deprecated Attach bytes with uploadEvidenceFile after metadata creation. */
  fileName?: string;
  /** @deprecated Attach bytes with uploadEvidenceFile after metadata creation. */
  filePath?: string;
  /** @deprecated Attach bytes with uploadEvidenceFile after metadata creation. */
  fileMimeType?: string;
  /** @deprecated Attach bytes with uploadEvidenceFile after metadata creation. */
  fileSha256?: string;
  /** @deprecated Attach bytes with uploadEvidenceFile after metadata creation. */
  fileSizeBytes?: number;
};

const EVIDENCE_BUCKET = 'compliance-evidence' as const;
export const EVIDENCE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

const EVIDENCE_ALLOWED_MIME_TYPE_SET = new Set<string>(EVIDENCE_ALLOWED_MIME_TYPES);

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown evidence error';
}

function normalizeOrganizationIds(rows: Array<{ organization_id?: string | null }> | null | undefined) {
  return [...new Set((rows ?? []).map((row) => row.organization_id).filter((value): value is string => Boolean(value)))];
}

function hasLegacyAttachmentInput(input: EvidenceInput) {
  return Boolean(
    input.fileName
      || input.filePath
      || input.fileMimeType
      || input.fileSha256
      || input.fileSizeBytes !== undefined,
  );
}

function validateEvidenceUpload(file: File) {
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > EVIDENCE_MAX_FILE_SIZE_BYTES) {
    throw new Error('Evidence file exceeds the supported 10 MB limit.');
  }

  const mimeType = file.type.trim().toLowerCase();
  if (!mimeType || !EVIDENCE_ALLOWED_MIME_TYPE_SET.has(mimeType)) {
    throw new Error('Evidence file type is not supported.');
  }

  return mimeType;
}

/**
 * Resolve the Evidence Vault tenant without guessing. If a user belongs to more
 * than one organization the caller must provide the active organization id.
 */
export async function resolveEvidenceOrganization(userId: string, preferredOrganizationId?: string | null) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId);

  if (error) throw error;
  const organizationIds = normalizeOrganizationIds(data as Array<{ organization_id?: string | null }> | null);

  if (preferredOrganizationId) {
    if (!organizationIds.includes(preferredOrganizationId)) {
      throw new Error('Selected organization is not available to the current user.');
    }
    return preferredOrganizationId;
  }

  if (organizationIds.length === 1) return organizationIds[0];
  if (organizationIds.length === 0) throw new Error('No organization is available for the Evidence Vault.');
  throw new Error('Multiple organizations are available; select an organization before opening the Evidence Vault.');
}

export async function createEvidenceItem(input: EvidenceInput) {
  if (hasLegacyAttachmentInput(input)) {
    throw new Error('Create Evidence metadata first, then attach bytes with uploadEvidenceFile.');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) throw new Error('Authentication is required to create evidence.');

  const { data, error } = await supabase
    .from('evidence_items')
    .insert({
      organization_id: input.organizationId,
      user_id: authData.user.id,
      finding_id: input.findingId || null,
      task_id: input.taskId || null,
      title: input.title,
      description: input.description || null,
      evidence_type: input.evidenceType || 'document',
      status: input.status || 'draft',
      article_refs: input.articleRefs || [],
      owner_name: input.ownerName || null,
      storage_bucket: EVIDENCE_BUCKET,
      expires_at: input.expiresAt || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as EvidenceItem;
}

export async function tryCreateEvidenceItem(input: EvidenceInput) {
  try {
    const evidence = await createEvidenceItem(input);
    return { ok: true as const, evidence };
  } catch (error) {
    return { ok: false as const, error: normalizeError(error) };
  }
}

export async function listEvidenceItems(params: { organizationId: string; limit?: number; includeDeleted?: boolean }) {
  let query = supabase
    .from('evidence_items')
    .select('*')
    .eq('organization_id', params.organizationId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50);

  if (!params.includeDeleted) query = query.is('deleted_at', null);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as EvidenceItem[];
}

export async function tryListEvidenceItems(params: { organizationId: string; limit?: number; includeDeleted?: boolean }) {
  try {
    return await listEvidenceItems(params);
  } catch {
    return [] as EvidenceItem[];
  }
}

export async function updateEvidenceStatus(params: { id: string; organizationId: string; status: EvidenceStatus }) {
  const { data, error } = await supabase
    .from('evidence_items')
    .update({ status: params.status })
    .eq('id', params.id)
    .eq('organization_id', params.organizationId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw error;
  return data as EvidenceItem;
}

export async function softDeleteEvidenceItem(params: { id: string; organizationId: string; reason: string }) {
  const reason = params.reason.trim();
  if (!reason) throw new Error('A deletion reason is required for Evidence Vault records.');

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) throw new Error('Authentication is required to archive evidence.');

  const { data, error } = await supabase
    .from('evidence_items')
    .update({
      status: 'archived',
      deleted_at: new Date().toISOString(),
      deleted_by_subject: authData.user.id,
      delete_reason: reason,
    })
    .eq('id', params.id)
    .eq('organization_id', params.organizationId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw error;
  return data as EvidenceItem;
}

function sanitizeFileName(fileName: string) {
  const safe = fileName.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return safe || 'evidence.bin';
}

async function sha256Hex(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate bytes before reserving immutable attachment metadata, then insert
 * under the exact <organization_id>/<evidence_id>/<filename> key. Storage and
 * database constraints independently enforce the same size/MIME boundary.
 */
export async function uploadEvidenceFile(params: { organizationId: string; evidenceId: string; file: File }) {
  const fileMimeType = validateEvidenceUpload(params.file);
  const fileName = sanitizeFileName(params.file.name);
  const objectPath = `${params.organizationId}/${params.evidenceId}/${fileName}`;
  const fileSha256 = await sha256Hex(params.file);
  const fileSizeBytes = params.file.size;

  const { data: reservation, error: reservationError } = await supabase
    .from('evidence_items')
    .update({
      file_name: fileName,
      file_path: objectPath,
      file_mime_type: fileMimeType,
      storage_bucket: EVIDENCE_BUCKET,
      storage_object_path: objectPath,
      file_sha256: fileSha256,
      file_size_bytes: fileSizeBytes,
    })
    .eq('id', params.evidenceId)
    .eq('organization_id', params.organizationId)
    .is('deleted_at', null)
    .select('id,organization_id,storage_object_path,file_sha256,file_size_bytes')
    .single();

  if (reservationError) throw reservationError;
  if (
    reservation?.id !== params.evidenceId
    || reservation?.organization_id !== params.organizationId
    || reservation?.storage_object_path !== objectPath
    || reservation?.file_sha256 !== fileSha256
    || reservation?.file_size_bytes !== fileSizeBytes
  ) {
    throw new Error('Evidence attachment metadata reservation could not be verified.');
  }

  const { error: uploadError } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(objectPath, params.file, {
      upsert: false,
      contentType: fileMimeType,
      cacheControl: '3600',
    });

  if (uploadError) throw uploadError;
  return {
    bucket: EVIDENCE_BUCKET,
    objectPath,
    fileName,
    fileMimeType,
    fileSizeBytes,
    fileSha256,
  };
}

export function summarizeEvidence(items: EvidenceItem[]) {
  const activeItems = items.filter((item) => !item.deleted_at);
  const total = activeItems.length;
  const valid = activeItems.filter((item) => item.status === 'valid').length;
  const needsReview = activeItems.filter((item) => item.status === 'needs_review').length;
  const expired = activeItems.filter((item) => item.status === 'expired').length;
  const linkedToFindings = activeItems.filter((item) => item.finding_id || item.task_id).length;
  const coverage = total === 0 ? 0 : Math.round((valid / total) * 100);

  return {
    total,
    valid,
    needsReview,
    expired,
    linkedToFindings,
    coverage,
  };
}
