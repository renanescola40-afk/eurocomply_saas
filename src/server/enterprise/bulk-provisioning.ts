import { createHash } from 'node:crypto';

import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import type { EnterpriseSeatType } from '@/server/enterprise/licensing';

const MAX_IMPORT_ROWS = 10_000;
const MAX_CSV_CHARACTERS = 4 * 1024 * 1024;

export const BULK_IMPORT_ROLES = ['admin', 'editor', 'viewer'] as const;
export type BulkImportRole = (typeof BULK_IMPORT_ROLES)[number];

export type EnterpriseProvisioningRow = {
  email: string;
  role: BulkImportRole;
  seatType: EnterpriseSeatType;
};

export type EnterpriseProvisioningJobResult = {
  outcome:
    | 'created'
    | 'duplicate'
    | 'invalid_input'
    | 'invalid_item_count'
    | 'invalid_item'
    | 'duplicate_email'
    | 'operator_required'
    | 'contract_not_active'
    | 'capacity_insufficient'
    | 'unavailable';
  jobId: string | null;
  jobStatus: string | null;
  totalItems: number;
  available: {
    members: number;
    fullUsers: number;
    participants: number;
    viewers: number;
    admins: number;
  };
};

export type ClaimedProvisioningItem = {
  itemId: string;
  jobId: string;
  organizationId: string;
  actorUserId: string;
  email: string;
  role: BulkImportRole;
  seatType: EnterpriseSeatType;
  attemptCount: number;
};

const importRowSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(BULK_IMPORT_ROLES),
  seatType: z.enum(['full', 'participant', 'viewer']),
});

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type JobRow = {
  outcome?: unknown;
  job_id?: unknown;
  job_status?: unknown;
  total_items?: unknown;
  available_members?: unknown;
  available_full_users?: unknown;
  available_participants?: unknown;
  available_viewers?: unknown;
  available_admins?: unknown;
};

type ClaimRow = {
  item_id?: unknown;
  job_id?: unknown;
  organization_id?: unknown;
  actor_user_id?: unknown;
  email?: unknown;
  role?: unknown;
  seat_type?: unknown;
  attempt_count?: unknown;
};

function rpcClient(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? (data as T) : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function parseCsvRecords(input: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      record.push(field);
      field = '';
    } else if (character === '\n') {
      record.push(field.replace(/\r$/, ''));
      field = '';
      if (record.some((value) => value.trim().length > 0)) records.push(record);
      record = [];
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('enterprise_csv_unclosed_quote');

  record.push(field.replace(/\r$/, ''));
  if (record.some((value) => value.trim().length > 0)) records.push(record);
  return records;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function defaultSeatType(role: BulkImportRole): EnterpriseSeatType {
  return role === 'viewer' ? 'viewer' : 'full';
}

export function parseEnterpriseProvisioningCsv(input: {
  csv: string;
  defaultRole?: BulkImportRole;
  defaultSeatType?: EnterpriseSeatType;
}): EnterpriseProvisioningRow[] {
  if (!input.csv || input.csv.length > MAX_CSV_CHARACTERS) {
    throw new Error('enterprise_csv_size_invalid');
  }

  const records = parseCsvRecords(input.csv.replace(/^\uFEFF/, ''));
  if (records.length < 2) throw new Error('enterprise_csv_rows_missing');
  if (records.length - 1 > MAX_IMPORT_ROWS) throw new Error('enterprise_csv_row_limit_exceeded');

  const headers = records[0].map(normalizeHeader);
  const emailIndex = headers.findIndex((header) => ['email', 'work_email', 'user_email'].includes(header));
  const roleIndex = headers.findIndex((header) => ['role', 'permission', 'access_role'].includes(header));
  const seatIndex = headers.findIndex((header) => ['seat_type', 'seat', 'license_type', 'licence_type'].includes(header));

  if (emailIndex < 0) throw new Error('enterprise_csv_email_header_missing');

  const defaultRoleValue = input.defaultRole ?? 'viewer';
  const rows = records.slice(1).map((record) => {
    const roleValue = (record[roleIndex] ?? defaultRoleValue).trim().toLowerCase() || defaultRoleValue;
    const role = BULK_IMPORT_ROLES.includes(roleValue as BulkImportRole)
      ? (roleValue as BulkImportRole)
      : defaultRoleValue;
    const requestedSeat = (record[seatIndex] ?? '').trim().toLowerCase();
    const seatType = requestedSeat === 'full' || requestedSeat === 'participant' || requestedSeat === 'viewer'
      ? requestedSeat
      : input.defaultSeatType ?? defaultSeatType(role);

    return importRowSchema.parse({
      email: record[emailIndex] ?? '',
      role,
      seatType,
    });
  });

  const emails = new Set<string>();
  for (const row of rows) {
    if (emails.has(row.email)) throw new Error('enterprise_csv_duplicate_email');
    emails.add(row.email);
  }

  return rows;
}

export function digestEnterpriseProvisioningRows(rows: EnterpriseProvisioningRow[]): string {
  return createHash('sha256').update(JSON.stringify(rows), 'utf8').digest('hex');
}

export async function createEnterpriseProvisioningJob(input: {
  organizationId: string;
  actorUserId: string;
  source: 'csv' | 'api' | 'scim' | 'sso' | 'platform' | 'admin';
  idempotencyKey: string;
  rows: EnterpriseProvisioningRow[];
}): Promise<EnterpriseProvisioningJobResult> {
  const { data, error } = await rpcClient().rpc('create_enterprise_provisioning_job_atomic', {
    p_organization_id: input.organizationId,
    p_actor_user_id: input.actorUserId,
    p_source: input.source,
    p_idempotency_key: input.idempotencyKey,
    p_request_digest: digestEnterpriseProvisioningRows(input.rows),
    p_items: input.rows,
  });

  if (error) {
    console.warn('[enterprise-provisioning] job_create_failed', { code: error.code ?? 'unknown' });
    throw new Error('enterprise_provisioning_job_unavailable');
  }

  const row = firstRow<JobRow>(data);
  if (!row || typeof row.outcome !== 'string') throw new Error('enterprise_provisioning_job_unavailable');

  const knownOutcomes = new Set<EnterpriseProvisioningJobResult['outcome']>([
    'created',
    'duplicate',
    'invalid_input',
    'invalid_item_count',
    'invalid_item',
    'duplicate_email',
    'operator_required',
    'contract_not_active',
    'capacity_insufficient',
  ]);

  return {
    outcome: knownOutcomes.has(row.outcome as EnterpriseProvisioningJobResult['outcome'])
      ? (row.outcome as EnterpriseProvisioningJobResult['outcome'])
      : 'unavailable',
    jobId: stringOrNull(row.job_id),
    jobStatus: stringOrNull(row.job_status),
    totalItems: integer(row.total_items),
    available: {
      members: integer(row.available_members),
      fullUsers: integer(row.available_full_users),
      participants: integer(row.available_participants),
      viewers: integer(row.available_viewers),
      admins: integer(row.available_admins),
    },
  };
}

export async function claimEnterpriseProvisioningItems(batchSize = 50): Promise<ClaimedProvisioningItem[]> {
  const { data, error } = await rpcClient().rpc('claim_enterprise_provisioning_items_atomic', {
    p_batch_size: batchSize,
  });

  if (error) {
    console.warn('[enterprise-provisioning] claim_failed', { code: error.code ?? 'unknown' });
    throw new Error('enterprise_provisioning_claim_unavailable');
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.map((value) => {
    const row = value as ClaimRow;
    const parsed = z.object({
      itemId: z.string().uuid(),
      jobId: z.string().uuid(),
      organizationId: z.string().uuid(),
      actorUserId: z.string().uuid(),
      email: z.string().email(),
      role: z.enum(BULK_IMPORT_ROLES),
      seatType: z.enum(['full', 'participant', 'viewer']),
      attemptCount: z.number().int().positive(),
    }).parse({
      itemId: row.item_id,
      jobId: row.job_id,
      organizationId: row.organization_id,
      actorUserId: row.actor_user_id,
      email: row.email,
      role: row.role,
      seatType: row.seat_type,
      attemptCount: row.attempt_count,
    });

    return parsed;
  });
}

export async function completeEnterpriseProvisioningItem(input: {
  itemId: string;
  outcome: 'succeeded' | 'failed' | 'retry';
  invitationId?: string | null;
  errorCode?: string | null;
}) {
  const { data, error } = await rpcClient().rpc('complete_enterprise_provisioning_item_atomic', {
    p_item_id: input.itemId,
    p_outcome: input.outcome,
    p_invitation_id: input.invitationId ?? null,
    p_error_code: input.errorCode ?? null,
  });

  if (error || !data) {
    console.warn('[enterprise-provisioning] completion_failed', { code: error?.code ?? 'unknown' });
    throw new Error('enterprise_provisioning_completion_unavailable');
  }

  return firstRow<Record<string, unknown>>(data);
}
