import { tryCreateAdminClient } from '@/lib/supabase/admin';

type DocumentStatusNotification = `document_${'uploaded'}`;

type NotificationInput = {
  organizationId: string;
  userId?: string | null;
  type: 'invite' | 'document' | 'alert' | 'system' | 'approval' | DocumentStatusNotification;
  title?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
};

export async function createNotification(input: NotificationInput) {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return { persisted: false };
  }

  const { error } = await supabase.from('notifications').insert({
    organization_id: input.organizationId,
    user_id: input.userId ?? null,
    type: input.type,
    message: input.message,
  });

  if (error) {
    console.warn('[notifications] create_failed', { code: error.code ?? 'unknown' });
    return { persisted: false };
  }

  return { persisted: true };
}
