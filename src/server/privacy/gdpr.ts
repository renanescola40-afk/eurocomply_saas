import { tryCreateAdminClient } from '@/lib/supabase/admin';

export const GDPR_DELETE_CONFIRMATION = 'DELETE ORGANIZATION DATA';
export const GDPR_DELETE_SAFETY_DELAY_HOURS = 72;

export type PrivacyInventoryTable = {
  key: string;
  table: string;
  columns: string;
  scopeColumn: 'organization_id' | 'id' | 'user_id';
  retentionClass: 'active_customer_data' | 'legal_billing_record' | 'audit_chain' | 'operational_log';
  exportable: boolean;
  deletable: 'delete' | 'anonymize' | 'preserve';
};

export const ORGANIZATION_EXPORT_TABLES: PrivacyInventoryTable[] = [
  { key: 'organizations', table: 'organizations', columns: 'id,name,slug,created_at,updated_at', scopeColumn: 'id', retentionClass: 'active_customer_data', exportable: true, deletable: 'anonymize' },
  { key: 'organization_members', table: 'organization_members', columns: 'id,organization_id,user_id,role,created_at,updated_at', scopeColumn: 'organization_id', retentionClass: 'active_customer_data', exportable: true, deletable: 'delete' },
  { key: 'documents', table: 'documents', columns: 'id,organization_id,name,category,status,expires_at,created_at,updated_at', scopeColumn: 'organization_id', retentionClass: 'active_customer_data', exportable: true, deletable: 'delete' },
  { key: 'risks', table: 'risks', columns: 'id,organization_id,title,description,category,status,severity,owner_id,created_at,updated_at', scopeColumn: 'organization_id', retentionClass: 'active_customer_data', exportable: true, deletable: 'delete' },
  { key: 'vendors', table: 'vendors', columns: 'id,organization_id,name,contact_email,status,risk_level,created_at,updated_at', scopeColumn: 'organization_id', retentionClass: 'active_customer_data', exportable: true, deletable: 'delete' },
  { key: 'tasks', table: 'tasks', columns: 'id,organization_id,title,description,status,assignee_id,due_date,created_at,updated_at', scopeColumn: 'organization_id', retentionClass: 'active_customer_data', exportable: true, deletable: 'delete' },
  { key: 'notifications', table: 'notifications', columns: 'id,organization_id,user_id,type,message,read_at,created_at', scopeColumn: 'organization_id', retentionClass: 'active_customer_data', exportable: true, deletable: 'delete' },
  { key: 'subscriptions', table: 'subscriptions', columns: 'id,organization_id,stripe_customer_id,stripe_subscription_id,status,plan,current_period_end,created_at,updated_at', scopeColumn: 'organization_id', retentionClass: 'legal_billing_record', exportable: true, deletable: 'preserve' },
  { key: 'billing_metadata', table: 'billing_metadata', columns: 'id,organization_id,provider,customer_id,subscription_id,status,metadata,created_at,updated_at', scopeColumn: 'organization_id', retentionClass: 'legal_billing_record', exportable: true, deletable: 'preserve' },
  { key: 'audit_events', table: 'audit_events', columns: 'id,organization_id,actor_user_id,action,entity_type,entity_id,metadata,created_at,previous_hash,event_hash,hash_algorithm,hash_signature', scopeColumn: 'organization_id', retentionClass: 'audit_chain', exportable: true, deletable: 'preserve' },
  { key: 'audit_logs', table: 'audit_logs', columns: 'id,organization_id,actor_user_id,action,entity_type,entity_id,metadata,created_at', scopeColumn: 'organization_id', retentionClass: 'audit_chain', exportable: true, deletable: 'preserve' },
  { key: 'logs', table: 'application_logs', columns: 'id,organization_id,level,message,metadata,created_at', scopeColumn: 'organization_id', retentionClass: 'operational_log', exportable: true, deletable: 'anonymize' },
];

export type OrganizationExportSubject = { userId: string; email?: string | null };

export type OrganizationExportContext = {
  organization: { id: string; name?: string | null; slug?: string | null };
  subject: OrganizationExportSubject;
  requestedAt?: string;
};

export type OrganizationDataExport = {
  schemaVersion: '2026-06-privacy-v1';
  generatedAt: string;
  scope: 'organization';
  subject: OrganizationExportSubject;
  organization: OrganizationExportContext['organization'];
  retentionNotice: string;
  tables: Record<string, unknown[]>;
  unavailableTables: Array<{ key: string; table: string; reason: string }>;
};

type QueryError = { code?: string; message?: string } | null;
type QueryResult = { data: unknown[] | null; error: QueryError };
type ScopedQuery = Promise<QueryResult> & {
  order?: (column: string, options: { ascending: boolean }) => Promise<QueryResult>;
};
type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => ScopedQuery;
    };
  };
};

function isExpectedMissingTable(error: QueryError) {
  return error?.code === '42P01' || error?.code === '42703' || error?.code === 'PGRST204' || error?.code === 'PGRST205';
}

async function safeListScopedRows(client: SupabaseLike, descriptor: PrivacyInventoryTable, organizationId: string, userId: string) {
  try {
    const query = client.from(descriptor.table).select(descriptor.columns);
    const scoped = descriptor.scopeColumn === 'id'
      ? query.eq('id', organizationId)
      : descriptor.scopeColumn === 'user_id'
        ? query.eq('user_id', userId)
        : query.eq('organization_id', organizationId);
    const result = typeof scoped.order === 'function' ? await scoped.order('created_at', { ascending: false }) : await scoped;

    if (result.error) {
      return { rows: [], unavailable: { key: descriptor.key, table: descriptor.table, reason: isExpectedMissingTable(result.error) ? 'schema_not_present' : 'query_failed' } };
    }

    return { rows: result.data ?? [], unavailable: null };
  } catch {
    return { rows: [], unavailable: { key: descriptor.key, table: descriptor.table, reason: 'query_failed' } };
  }
}

export async function collectOrganizationDataExport(context: OrganizationExportContext): Promise<OrganizationDataExport> {
  const supabase = tryCreateAdminClient() as unknown as SupabaseLike | null;
  const tables: Record<string, unknown[]> = {};
  const unavailableTables: OrganizationDataExport['unavailableTables'] = [];

  for (const descriptor of ORGANIZATION_EXPORT_TABLES.filter((table) => table.exportable)) {
    if (!supabase) {
      tables[descriptor.key] = [];
      unavailableTables.push({ key: descriptor.key, table: descriptor.table, reason: 'admin_client_unavailable' });
      continue;
    }

    const result = await safeListScopedRows(supabase, descriptor, context.organization.id, context.subject.userId);
    tables[descriptor.key] = result.rows;
    if (result.unavailable) unavailableTables.push(result.unavailable);
  }

  return {
    schemaVersion: '2026-06-privacy-v1',
    generatedAt: context.requestedAt ?? new Date().toISOString(),
    scope: 'organization',
    subject: context.subject,
    organization: context.organization,
    retentionNotice: 'Export contains customer data available to EuroComply. Billing, tax, security and chained audit records may be retained after deletion requests according to DATA_RETENTION_POLICY.md.',
    tables,
    unavailableTables,
  };
}

export type DeleteRequestBody = { confirmation?: unknown; reason?: unknown };

export function validateDeleteConfirmation(body: DeleteRequestBody) {
  return body.confirmation === GDPR_DELETE_CONFIRMATION;
}

export function normalizeDeleteReason(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 500) : 'No reason provided';
}

export function buildGdprDeletePlan(now = new Date()) {
  const reviewNotBefore = new Date(now.getTime() + GDPR_DELETE_SAFETY_DELAY_HOURS * 60 * 60 * 1000).toISOString();
  const actions = ORGANIZATION_EXPORT_TABLES.map((table) => ({
    key: table.key,
    table: table.table,
    retentionClass: table.retentionClass,
    action: table.deletable,
    reason:
      table.deletable === 'preserve'
        ? 'Preserved for billing/legal retention or immutable audit-chain integrity.'
        : table.deletable === 'anonymize'
          ? 'Personal fields must be redacted while preserving tenant/security references.'
          : 'Eligible for deletion after review and safety delay.',
  }));

  return {
    status: 'pending_review' as const,
    safetyDelayHours: GDPR_DELETE_SAFETY_DELAY_HOURS,
    reviewNotBefore,
    requiresManualCompletion: true,
    legalRetentionPreserved: actions.filter((action) => action.action === 'preserve').map((action) => action.key),
    actions,
  };
}
