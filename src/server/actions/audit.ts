import { writeAuditLog } from '@/lib/security/audit-log';

type AuditInput = {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export const logAuditEvent = async (input: AuditInput) => writeAuditLog({
  organizationId: input.organizationId,
  actorUserId: input.actorUserId,
  action: input.action,
  entityType: input.entityType,
  entityId: input.entityId,
  metadata: input.metadata,
});
