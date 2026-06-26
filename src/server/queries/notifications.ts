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

  const metadata = {
    ...(input.metadata ?? {}),
    appNotificationType: input.type,
    title: input.title ?? null,
  };

  const { error } = await supabase.from('notifications').insert({
    organization_id: input.organizationId,
    user_id: input.userId ?? null,
    type: toPersistedNotificationType(input.type),
    message: input.message,
    metadata,
  });

  if (error) {
    console.warn('[notifications] create_failed', { code: error.code ?? 'unknown' });
    return { persisted: false };
  }

  return { persisted: true };
}
