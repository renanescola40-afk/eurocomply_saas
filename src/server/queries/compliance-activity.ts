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

const demoAuditRows: AuditLogItem[] = [
  { id: 'demo-audit-1', actor: 'Admin', action: 'Atualizou documento controlado', type: 'Documento', createdAt: '2025-04-02 09:20' },
  { id: 'demo-audit-2', actor: 'Compliance', action: 'Aprovou matriz de riscos', type: 'Aprovação', createdAt: '2025-04-08 14:10' },
  { id: 'demo-audit-3', actor: 'Sistema', action: 'Gerou relatório mensal', type: 'Sistema', createdAt: '2025-05-01 08:00' },
];

const demoNotifications: NotificationItem[] = [
  { id: 'demo-note-1', type: 'invite', message: 'Você convidou joao@empresa.com para colaborar.', read: false, createdAt: 'há 5 minutos' },
  { id: 'demo-note-2', type: 'document', message: 'Maria editou a matriz de riscos.', read: false, createdAt: 'há 22 minutos' },
  { id: 'demo-note-3', type: 'system', message: 'Novo relatório de compliance gerado automaticamente.', read: true, createdAt: 'ontem' },
  { id: 'demo-note-4', type: 'approval', message: 'Convite aceite por ana@empresa.com.', read: true, createdAt: '2 dias atrás' },
];

export async function listAuditEventsForUser(userId: string): Promise<AuditLogItem[]> {
  const organization = await getCurrentOrganizationForUser(userId);

  if (!organization) {
    return demoAuditRows;
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

  return data.map((item) => ({
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
