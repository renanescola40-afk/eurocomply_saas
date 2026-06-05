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
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type EvidenceInput = {
  userId: string;
  workspaceId?: string | null;
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
  expiresAt?: string | null;
};

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown evidence error';
}

export async function createEvidenceItem(input: EvidenceInput) {
  const { data, error } = await supabase
    .from('evidence_items')
    .insert({
      workspace_id: input.workspaceId || null,
      user_id: input.userId,
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

export async function listEvidenceItems(params: { userId?: string | null; workspaceId?: string | null; limit?: number }) {
  let query = supabase
    .from('evidence_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50);

  if (params.workspaceId) {
    query = query.eq('workspace_id', params.workspaceId);
  } else if (params.userId) {
    query = query.eq('user_id', params.userId);
  } else {
    return [] as EvidenceItem[];
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as EvidenceItem[];
}

export async function tryListEvidenceItems(params: { userId?: string | null; workspaceId?: string | null; limit?: number }) {
  try {
    return await listEvidenceItems(params);
  } catch {
    return [] as EvidenceItem[];
  }
}

export async function updateEvidenceStatus(params: { id: string; userId: string; status: EvidenceStatus }) {
  const { data, error } = await supabase
    .from('evidence_items')
    .update({ status: params.status, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', params.userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as EvidenceItem;
}

export function summarizeEvidence(items: EvidenceItem[]) {
  const total = items.length;
  const valid = items.filter((item) => item.status === 'valid').length;
  const needsReview = items.filter((item) => item.status === 'needs_review').length;
  const expired = items.filter((item) => item.status === 'expired').length;
  const linkedToFindings = items.filter((item) => item.finding_id || item.task_id).length;
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
