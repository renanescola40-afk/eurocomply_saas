import { createAdminClient } from '@/lib/supabase/admin';

export const SALES_LEAD_STATUSES = [
  'new',
  'qualified',
  'demo_scheduled',
  'proposal_sent',
  'won',
  'lost',
  'nurture',
] as const;

export const SALES_LEAD_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export const SALES_LEAD_ACTIVITY_TYPES = ['note', 'status_change', 'follow_up', 'email', 'call', 'demo', 'proposal'] as const;

export type SalesLeadStatus = (typeof SALES_LEAD_STATUSES)[number];
export type SalesLeadPriority = (typeof SALES_LEAD_PRIORITIES)[number];
export type SalesLeadActivityType = (typeof SALES_LEAD_ACTIVITY_TYPES)[number];

export type SalesLeadFilters = {
  status?: SalesLeadStatus;
  priority?: SalesLeadPriority;
  source?: string;
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
  estimated_value_cents: number | null;
  currency: string;
  plan_interest: string | null;
  updated_at: string;
  lost_reason: string | null;
};

export type SalesLeadNote = {
  id: string;
  lead_id: string;
  created_by: string | null;
  body: string;
  created_at: string;
};

export type SalesLeadActivity = {
  id: string;
  lead_id: string;
  created_by: string | null;
  type: SalesLeadActivityType | string;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SalesLeadMetrics = Record<SalesLeadStatus, number>;

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

function normalizePriority(value: string | string[] | undefined): SalesLeadPriority | undefined {
  const normalized = boundedText(value, 40);
  return SALES_LEAD_PRIORITIES.includes(normalized as SalesLeadPriority) ? (normalized as SalesLeadPriority) : undefined;
}

function escapeIlike(value: string) {
  return value.replace(/[%,_()]/g, '').slice(0, 160);
}

export function normalizeSalesLeadFilters(searchParams: Record<string, string | string[] | undefined> = {}): SalesLeadFilters {
  return {
    status: normalizeStatus(searchParams.status),
    priority: normalizePriority(searchParams.priority),
    source: boundedText(searchParams.source, 120),
    search: boundedText(searchParams.search, 160),
    page: normalizePage(searchParams.page),
    pageSize: normalizePageSize(searchParams.pageSize),
  };
}

export function emptySalesLeadMetrics(): SalesLeadMetrics {
  return SALES_LEAD_STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as SalesLeadMetrics);
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
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.source) query = query.eq('source', filters.source);
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

export async function getSalesLeadMetrics() {
  const supabase = createAdminClient();
  const metrics = emptySalesLeadMetrics();

  const { data, error } = await supabase
    .from('sales_leads')
    .select('status')
    .is('gdpr_deleted_at', null);

  if (error) {
    throw new Error('Unable to load sales lead metrics.');
  }

  for (const row of data ?? []) {
    const status = row.status as SalesLeadStatus;
    if (SALES_LEAD_STATUSES.includes(status)) metrics[status] += 1;
  }

  return metrics;
}

export async function getSalesLeadDetail(leadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sales_leads')
    .select(
      'id, created_at, full_name, work_email, company_name, role, company_size, region, compliance_drivers, timeline, current_process, message, source, locale, consent_to_contact, status, priority, next_follow_up_at, last_contacted_at, last_activity_at, estimated_value_cents, currency, plan_interest, updated_at, lost_reason',
    )
    .eq('id', leadId)
    .is('gdpr_deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load sales lead.');
  }

  return data as SalesLeadDetail | null;
}

export async function listSalesLeadActivities(leadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sales_lead_activities')
    .select('id, lead_id, created_by, type, body, metadata, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error('Unable to load sales lead activity.');
  }

  return (data ?? []) as SalesLeadActivity[];
}

export async function listSalesLeadNotes(leadId: string) {
  const activities = await listSalesLeadActivities(leadId);
  return activities
    .filter((activity) => activity.type === 'note')
    .slice(0, 25)
    .map((activity) => ({
      id: activity.id,
      lead_id: activity.lead_id,
      created_by: activity.created_by,
      body: activity.body,
      created_at: activity.created_at,
    })) satisfies SalesLeadNote[];
}
