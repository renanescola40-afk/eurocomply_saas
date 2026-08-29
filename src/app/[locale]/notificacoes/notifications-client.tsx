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
  const alertCount = notifications.filter((item) => item.type === 'alertas').length;
  const documentCount = notifications.filter((item) => item.type === 'documentos').length;

  function markAllAsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
  }

  function toggleRead(id: string) {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, unread: !item.unread } : item)));
  }

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300/70">
              <Bell className="h-3.5 w-3.5" aria-hidden="true" /> Notificações
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Feed de atividades da equipa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">Histórico cronológico de convites, documentos, alertas e sinais do sistema para manter a operação explicável.</p>
          </div>
          <button type="button" onClick={markAllAsRead} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Marcar todas como lidas
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo de notificações">
          <article className="rounded-2xl border border-white/[0.075] bg-[#0d1522] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Não lidas</p><p className="mt-2 text-2xl font-semibold tabular-nums text-white/90">{unreadCount}</p></article>
          <article className="rounded-2xl border border-white/[0.075] bg-[#0d1522] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Alertas</p><p className="mt-2 text-2xl font-semibold tabular-nums text-white/90">{alertCount}</p></article>
          <article className="rounded-2xl border border-white/[0.075] bg-[#0d1522] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Documentos</p><p className="mt-2 text-2xl font-semibold tabular-nums text-white/90">{documentCount}</p></article>
        </section>

        <section className="flex flex-wrap gap-1.5 rounded-2xl border border-white/[0.075] bg-[#0d1522] p-2" aria-label="Filtros de notificações">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={activeFilter === filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${activeFilter === filter.value ? 'border-blue-400/25 bg-blue-500/[0.12] text-blue-100' : 'border-transparent text-white/48 hover:bg-white/[0.04] hover:text-white'}`}
            >
              {filter.label}
            </button>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0d1522]" aria-label="Feed de notificações">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b border-white/[0.06] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
            <span>Atividade</span><span>Estado</span>
          </div>
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-white/[0.055]">
              {filteredNotifications.map((notification) => {
                const Icon = iconMap[notification.type];
                return (
                  <article key={notification.id} className="px-5 py-4 transition-colors hover:bg-blue-500/[0.035]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${notification.type === 'alertas' ? 'border-amber-300/20 bg-amber-300/[0.07] text-amber-200' : notification.unread ? 'border-blue-400/20 bg-blue-500/10 text-blue-300' : 'border-white/[0.07] bg-white/[0.025] text-white/38'}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-6 text-white/82">{notification.message}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/32">
                            <span className="capitalize">{notification.type}</span><span>·</span><span>{notification.timestamp}</span>
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => toggleRead(notification.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${notification.unread ? 'border-blue-400/20 bg-blue-500/[0.08] text-blue-100/80 hover:bg-blue-500/[0.14]' : 'border-white/[0.07] text-white/42 hover:bg-white/[0.04] hover:text-white'}`}>
                        {notification.unread ? 'Marcar como lida' : 'Marcar como não lida'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-sm text-white/42" role="status">
              <p className="font-medium text-white/62">Nada neste filtro agora.</p>
              <p className="mt-1">Troque o filtro ou volte ao Command Center.</p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.075] bg-[#0d1522] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white/82">Histórico de equipa e auditoria</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/42">Compare planos quando precisar de ampliar histórico, colaboração e controlos de auditoria.</p>
          </div>
          <Link href={`/${locale}/pricing`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-semibold text-white/65 transition hover:border-blue-400/20 hover:bg-blue-500/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">Comparar planos</Link>
        </section>
      </div>
    </main>
  );
}
