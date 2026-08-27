'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, CheckCircle2, FileText, MailPlus, ShieldCheck } from 'lucide-react';
import type { NotificationItem } from '@/server/queries/compliance-activity';

type NotificationType = 'convites' | 'documentos' | 'sistema' | 'alertas';
type Filter = 'todas' | 'nao-lidas' | NotificationType;

type FeedNotification = {
  id: string;
  type: NotificationType;
  unread: boolean;
  message: string;
  timestamp: string;
};

const iconMap = {
  convites: MailPlus,
  documentos: FileText,
  sistema: ShieldCheck,
  alertas: AlertTriangle,
};

const filters: { label: string; value: Filter }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Não lidas', value: 'nao-lidas' },
  { label: 'Convites', value: 'convites' },
  { label: 'Documentos', value: 'documentos' },
  { label: 'Sistema', value: 'sistema' },
  { label: 'Alertas', value: 'alertas' },
];

function mapNotificationType(type: NotificationItem['type']): NotificationType {
  if (type === 'invite') return 'convites';
  if (type === 'document' || type === 'approval') return 'documentos';
  if (type === 'alert') return 'alertas';
  return 'sistema';
}

function toFeedNotifications(items: NotificationItem[]): FeedNotification[] {
  return items.map((item) => ({
    id: item.id,
    type: mapNotificationType(item.type),
    unread: !item.read,
    message: item.message,
    timestamp: item.createdAt,
  }));
}

export function NotificationsClient({ locale, initialNotifications }: { locale: string; initialNotifications: NotificationItem[] }) {
  const [activeFilter, setActiveFilter] = useState<Filter>('todas');
  const [notifications, setNotifications] = useState<FeedNotification[]>(() => toFeedNotifications(initialNotifications));

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'todas') return notifications;
    if (activeFilter === 'nao-lidas') return notifications.filter((item) => item.unread);
    return notifications.filter((item) => item.type === activeFilter);
  }, [activeFilter, notifications]);

  const unreadCount = notifications.filter((item) => item.unread).length;

  function markAllAsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
  }

  function toggleRead(id: string) {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, unread: !item.unread } : item)));
  }

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-4 border-b border-white/[0.065] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              <Bell className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" /> Notificações
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">Feed de atividades da equipa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Histórico cronológico de convites, documentos, alertas e sinais do sistema para manter a operação explicável.</p>
          </div>
          <div className="rounded-xl border border-white/[0.075] bg-[#101715] px-4 py-3 text-right">
            <p className="text-2xl font-semibold text-white/88">{unreadCount}</p>
            <p className="text-[10px] uppercase tracking-[0.13em] text-white/34">não lidas</p>
          </div>
        </header>

        <section className="flex flex-col gap-3 rounded-xl border border-white/[0.075] bg-[#101715] p-3 lg:flex-row lg:items-center lg:justify-between" aria-label="Filtros de notificações">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={activeFilter === filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 ${activeFilter === filter.value ? 'border-emerald-300/20 bg-emerald-300/[0.09] text-emerald-100' : 'border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={markAllAsRead} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-medium text-white/65 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" /> Marcar todas como lidas
          </button>
        </section>

        <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-label="Feed de notificações">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-white/[0.055]">
              {filteredNotifications.map((notification) => {
                const Icon = iconMap[notification.type];
                return (
                  <article key={notification.id} className="px-5 py-4 transition-colors hover:bg-white/[0.018]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${notification.unread ? 'border-emerald-300/20 bg-emerald-300/[0.09] text-emerald-300' : 'border-white/[0.07] bg-white/[0.025] text-white/38'}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium leading-6 text-white/82">{notification.message}</p>
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${notification.unread ? 'border-emerald-300/18 text-emerald-100/75' : 'border-white/[0.07] text-white/32'}`}>{notification.unread ? 'não lida' : 'lida'}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-white/34">{notification.timestamp}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => toggleRead(notification.id)} className="shrink-0 rounded-lg border border-white/[0.07] px-3 py-2 text-xs font-medium text-white/48 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">
                        {notification.unread ? 'Marcar como lida' : 'Marcar como não lida'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-sm text-white/42" role="status">
              <p className="font-medium text-white/60">Nada neste filtro agora.</p>
              <p className="mt-1">Troque o filtro ou volte ao Command Center.</p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-white/[0.075] bg-[#101715] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white/82">Histórico de equipa e auditoria</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/42">Compare planos quando precisar de ampliar histórico, colaboração e controlos de auditoria.</p>
          </div>
          <Link href={`/${locale}/pricing`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-semibold text-white/65 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">Comparar planos</Link>
        </section>
      </div>
    </main>
  );
}
