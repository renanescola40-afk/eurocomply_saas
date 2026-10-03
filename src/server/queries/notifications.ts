import { tryCreateAdminClient } from '@/lib/supabase/admin';

type AppNotificationType = 'invite' | 'document' | 'alert' | 'system' | 'approval' | 'document_uploaded';
type PersistedNotificationType = 'info' | 'success' | 'warning' | 'error';

type NotificationInput = {
  organizationId: string;
  userId?: string | null;
  type: AppNotificationType;
  title?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
};

function toPersistedNotificationType(type: AppNotificationType): PersistedNotificationType {
  if (type === 'alert') return 'warning';
  if (type === 'document_uploaded') return 'success';
  return 'info';
}

export async function createNotification(input: NotificationInput) {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return { persisted: false };
  }

  // Production notifications currently persist title/message/type only.
  // Keep caller metadata as an application-level input until the database
  // contract explicitly gains a metadata column through a reviewed migration.
  void input.metadata;

  const { error } = await supabase.from('notifications').insert({
    organization_id: input.organizationId,
    user_id: input.userId ?? null,
    title: input.title ?? null,
    type: toPersistedNotificationType(input.type),
    message: input.message,
  });

  if (error) {
    console.warn('[notifications] create_failed', { code: error.code ?? 'unknown' });
    return { persisted: false };
  }

  return { persisted: true };
}
