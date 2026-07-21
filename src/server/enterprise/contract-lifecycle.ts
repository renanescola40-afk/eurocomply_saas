import { createAdminClient } from '@/lib/supabase/admin';

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

export type EnterpriseContractLifecycleTransition = {
  contractId: string;
  organizationId: string;
  previousStatus: string;
  appliedStatus: string;
  reason: string;
};

type TransitionRow = {
  contract_id?: unknown;
  organization_id?: unknown;
  previous_status?: unknown;
  applied_status?: unknown;
  reason?: unknown;
};

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function processEnterpriseContractLifecycle(batchSize = 100) {
  const safeBatchSize = Math.min(Math.max(Math.trunc(batchSize), 1), 500);
  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc('process_enterprise_contract_lifecycle_v2_atomic', {
    p_batch_size: safeBatchSize,
  });

  if (error) {
    console.warn('[enterprise-contract-lifecycle] processing_failed', {
      code: error.code ?? 'unknown',
    });
    throw new Error('enterprise_contract_lifecycle_unavailable');
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const transitions: EnterpriseContractLifecycleTransition[] = [];

  for (const value of rows) {
    const row = value as TransitionRow;
    const contractId = stringField(row.contract_id);
    const organizationId = stringField(row.organization_id);
    const previousStatus = stringField(row.previous_status);
    const appliedStatus = stringField(row.applied_status);
    const reason = stringField(row.reason);

    if (!contractId || !organizationId || !previousStatus || !appliedStatus || !reason) {
      throw new Error('enterprise_contract_lifecycle_invalid_result');
    }

    transitions.push({ contractId, organizationId, previousStatus, appliedStatus, reason });
  }

  return {
    processed: transitions.length,
    transitions,
  };
}
