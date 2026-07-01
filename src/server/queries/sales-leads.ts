import { createAdminClient } from '@/lib/supabase/admin';

export const SALES_LEAD_STATUSES = [
  'new',
  'qualified',
  'contacted',
  'demo_scheduled',
  'trial_started',
  'customer',
  'lost',
  'disqualified',
] as const;

export const SALES_LEAD_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type SalesLeadStatus = (typeof SALES_LEAD_STATUSES)[number];
export type SalesLeadPriority = (typeof SALES_LEAD_PRIORITIES)[number];

export type SalesLeadFilters = {
  status?: SalesLeadStatus;
  source?: string;
  timeline?: string;
  companySize?: string;
  from?: string;
  to?: string;
  search?: string;
  page: number;
  pageSize: number;
};

export type SalesLeadListItem = {
  id: string;
  created_at: string;
  full_name: string;
  work_email: string;
  company_name: string;
  role: string | null;
  company_size: string | null;
  region: string | null;
  compliance_drivers: string | null;
  timeline: string | null;
  source: string;
  status: string;
  priority: string;
  next_follow_up_at: string | null;
  last_activity_at: string | null;
};

export type SalesLeadDetail = SalesLeadListItem & {
  current_process: string | null;
  message: string | null;
  consent_to_contact: boolean;
  locale: string | null;
  last_contacted_at: string | null;
  updated_at: string;
  lost_reason: string | null;
  disqualified_reason: string | null;
};

export type SalesLeadNote = {
  id: string;
  lead_id: string;
  created_by: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type SalesLeadActivityEvent = {
  id: string;
  lead_id: string;
  actor_user_id: string | null;
  action: string;
  previous_value: Record<string, unknown> | null;
  next_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 25;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function boundedText(value: string | string[] | undefined, maxLength: number) {
  const normalized = first(value)?.trim().replace(/\s+/g, ' ');
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
}

function normalizePage(value: string | string[] | undefined) {
  const parsed = Number.parseInt(first(value) ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizePageSize(value: string | string[] | undefined) {
  const parsed = Number.parseInt(first(value) ?? String(DEFAULT_PAGE_SIZE), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function normalizeStatus(value: string | string[] | undefined): SalesLeadStatus | undefined {
  const normalized = boundedText(value, 40);
  return SALES_LEAD_STATUSES.includes(normalized as SalesLeadStatus) ? (normalized as SalesLeadStatus) : undefined;
}

function normalizeDate(value: string | string[] | undefined) {
  const text = boundedText(value, 32);
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function escapeIlike(value: string) {
  return value.replace(/[%,_()]/g, '').slice(0, 160);
}

export function normalizeSalesLeadFilters(searchParams: Record<string, string | string[] | undefined> = {}): SalesLeadFilters {
  return {
    status: normalizeStatus(searchParams.status),
    source: boundedText(searchParams.source, 120),
    timeline: boundedText(searchParams.timeline, 120),
    companySize: boundedText(searchParams.companySize, 80),
    from: normalizeDate(searchParams.from),
    to: normalizeDate(searchParams.to),
    search: boundedText(searchParams.search, 160),
    page: normalizePage(searchParams.page),
    pageSize: normalizePageSize(searchParams.pageSize),
  };
}

export async function listSalesLeads(filters: SalesLeadFilters) {
  const supabase = createAdminClient();
  const offset = (filters.page - 1) * filters.pageSize;
  const last = offset + filters.pageSize - 1;

  let query = supabase
    .from('sales_leads')
    .select(
      'id, created_at, full_name, work_email, company_name, role, company_size, region, compliance_drivers, timeline, source, status, priority, next_follow_up_at, last_activity_at',
      { count: 'exact' },
    )
    .is('gdpr_deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, last);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.timeline) query = query.eq('timeline', filters.timeline);
  if (filters.companySize) query = query.eq('company_size', filters.companySize);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);
  if (filters.search) {
    const search = escapeIlike(filters.search);
    query = query.or(`company_name.ilike.%${search}%,work_email.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error('Unable to load sales leads.');
  }

  return {
    leads: (data ?? []) as SalesLeadListItem[],
    count: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getSalesLeadDetail(leadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sales_leads')
    .select(
      'id, created_at, full_name, work_email, company_name, role, company_size, region, compliance_drivers, timeline, current_process, message, source, locale, consent_to_contact, status, priority, next_follow_up_at, last_contacted_at, last_activity_at, updated_at, lost_reason, disqualified_reason',
    )
    .eq('id', leadId)
    .is('gdpr_deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load sales lead.');
  }

  return data as SalesLeadDetail | null;
}

export async function listSalesLeadNotes(leadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sales_lead_notes')
    .select('id, lead_id, created_by, body, created_at, updated_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    throw new Error('Unable to load sales lead notes.');
  }

  return (data ?? []) as SalesLeadNote[];
}

export async function listSalesLeadActivityEvents(leadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sales_lead_activity_events')
    .select('id, lead_id, actor_user_id, action, previous_value, next_value, metadata, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error('Unable to load sales lead activity.');
  }

  return (data ?? []) as SalesLeadActivityEvent[];
}
