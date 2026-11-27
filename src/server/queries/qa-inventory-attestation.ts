import { createHmac } from 'node:crypto';

// QA-only transport attestation. The key is independent of the database login
// and audit-chain key. The signed bytes are passed unchanged to PostgreSQL.
export function signQaInventoryCall(secret: string, context: {
  transactionId: string; backendPid: number; organizationId: string;
  claims: Record<string, unknown>;
}, operation: 'head' | 'mutate' | 'append', args: Record<string, unknown>) {
  if (!/^[a-f0-9]{64}$/.test(secret) || !/^[0-9]+$/.test(context.transactionId)
    || !Number.isSafeInteger(context.backendPid) || context.backendPid <= 0) {
    throw new Error('qa_inventory_attestation_unavailable');
  }
  const payload = JSON.stringify({
    version: 1, project: 'zrxrrfbllsxtleyxjpsz', ...context,
    operation, args, issuedAt: Math.floor(Date.now() / 1000),
  });
  return [payload, createHmac('sha256', secret).update(payload, 'utf8').digest('hex')] as const;
}
