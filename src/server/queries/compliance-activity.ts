import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

export type AuditLogItem = {
  id: string;
  actor: string;
  action: string;
  type: string;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  type: 'invite' | 'document' | 'alert' | 'system' | 'approval';
  message: string;
  read: boolean;
  createdAt: string;
};

const demoNotifications: NotificationItem[] = [
  { id: 'demo-note-1', type: 'invite', message: 'Você convidou joao@empresa.com para colaborar.', read: false, createdAt: 'há 5 minutos' },
  { id: 'demo-note-2', type: 'document', message: 'Maria editou a matriz de riscos.', read: false, createdAt: 'há 22 minutos' },
  { id: 'demo-note-3', type: 'system', message: 'Novo relatório de compliance gerado automaticamente.', read: true, createdAt: 'ontem' },
  { id: 'demo-note-4', type: 'approval', message: 'Convite aceite por ana@empresa.com.', read: true, createdAt: '2 dias atrás' },
];

export async function listAuditEventsForUser(userId: string): Promise<AuditLogItem[]> {
  const organization = await getCurrentOrganizationForUser(userId);

  if (!organization) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('audit_events')
    .select('id,actor_user_id,action,entity_type,created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[audit] list_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load audit activity.');
  }

  if (!data?.length) {
    return [];
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    actor: item.actor_user_id ? 'Usuário autenticado' : 'Sistema',
    action: item.action,
    type: item.entity_type,
    createdAt: item.created_at ? new Date(item.created_at).toLocaleString('pt-PT') : 'Sem data',
  }));
}

export async function listNotificationsForUser(userId: string): Promise<NotificationItem[]> {
  const organization = await getCurrentOrganizationForUser(userId);

  if (!organization) {
    return demoNotifications;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('id,type,message,read_at,created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[notifications] list_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load notifications.');
  }

  if (!data?.length) {
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    type: item.type,
    message: item.message,
    read: Boolean(item.read_at),
    createdAt: item.created_at ? new Date(item.created_at).toLocaleString('pt-PT') : 'Sem data',
  }));
}
