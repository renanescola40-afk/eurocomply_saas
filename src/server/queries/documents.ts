import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

const DOCUMENT_COLUMNS = 'id,organization_id,name,category,status,expires_at,created_at,updated_at';
const DEFAULT_DOCUMENTS_PAGE_SIZE = 50;
const MAX_DOCUMENTS_PAGE_SIZE = 100;

type DocumentRow = {
  id: string;
  organization_id: string;
  name?: string | null;
  category?: string | null;
  status?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type NormalizedDocumentRow = Omit<Required<DocumentRow>, 'name' | 'category' | 'status' | 'expires_at' | 'created_at' | 'updated_at'> & {
  name: string | null;
  category: string | null;
  status: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  title: string;
  version: number;
};

export type ListDocumentsOptions = {
  page?: number;
  pageSize?: number;
};

function normalizeDocumentRow(document: DocumentRow): NormalizedDocumentRow {
  const name = document.name ?? null;

  return {
    id: document.id,
    organization_id: document.organization_id,
    name,
    category: document.category ?? null,
    status: document.status ?? null,
    expires_at: document.expires_at ?? null,
    created_at: document.created_at ?? null,
    updated_at: document.updated_at ?? null,
    title: name ?? 'Documento sem título',
    version: 1,
  };
}

function getDocumentsPaginationRange(options: ListDocumentsOptions = {}) {
  const safePage = Math.max(1, Math.floor(options.page ?? 1));
  const safePageSize = Math.max(1, Math.min(Math.floor(options.pageSize ?? DEFAULT_DOCUMENTS_PAGE_SIZE), MAX_DOCUMENTS_PAGE_SIZE));
  const from = (safePage - 1) * safePageSize;

  return { from, to: from + safePageSize - 1, pageSize: safePageSize };
}

export async function listDocuments(organizationId: string, options: ListDocumentsOptions = {}) {
  noStore();

  const supabase = createAdminClient();
  const { from, to } = getDocumentsPaginationRange(options);
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.warn('[documents] list_failed', { code: error.code ?? 'unknown' });
    throw new Error('documents_register_unavailable');
  }

  return (data ?? []).map((document) => normalizeDocumentRow(document as DocumentRow));
}

export async function getDocument(documentId: string, organizationId: string) {
  noStore();

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    console.warn('[documents] get_failed', { code: error.code });
    throw error;
  }

  return normalizeDocumentRow(data as DocumentRow);
}
