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
  fileName?: string;
  filePath?: string;
  fileMimeType?: string;
  fileSha256?: string;
  fileSizeBytes?: number;
  expiresAt?: string | null;
};

const EVIDENCE_BUCKET = 'compliance-evidence' as const;

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown evidence error';
}

function normalizeOrganizationIds(rows: Array<{ organization_id?: string | null }> | null | undefined) {
  return [...new Set((rows ?? []).map((row) => row.organization_id).filter((value): value is string => Boolean(value)))];
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
      file_name: input.fileName || null,
      file_path: input.filePath || null,
      file_mime_type: input.fileMimeType || null,
      storage_bucket: EVIDENCE_BUCKET,
      storage_object_path: input.filePath || null,
      file_sha256: input.fileSha256 || null,
      file_size_bytes: input.fileSizeBytes ?? null,
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
    .update({ status: params.status, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('organization_id', params.organizationId)
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
      updated_at: new Date().toISOString(),
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

/** Upload bytes under the canonical <organization_id>/<object_id>/<filename> key. */
export async function uploadEvidenceFile(params: { organizationId: string; file: File }) {
  const objectId = crypto.randomUUID();
  const fileName = sanitizeFileName(params.file.name);
  const objectPath = `${params.organizationId}/${objectId}/${fileName}`;
  const fileSha256 = await sha256Hex(params.file);

  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(objectPath, params.file, {
      upsert: false,
      contentType: params.file.type || 'application/octet-stream',
      cacheControl: '3600',
    });

  if (error) throw error;
  return {
    bucket: EVIDENCE_BUCKET,
    objectPath,
    fileName,
    fileMimeType: params.file.type || 'application/octet-stream',
    fileSizeBytes: params.file.size,
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
