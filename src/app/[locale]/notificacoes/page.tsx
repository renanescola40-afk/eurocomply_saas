'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, CheckCircle2, FileText, MailPlus, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type NotificationType = 'convites' | 'documentos' | 'sistema' | 'alertas';
type Filter = 'todas' | 'nao-lidas' | NotificationType;

const iconMap = {
  convites: MailPlus,
  documentos: FileText,
  sistema: ShieldCheck,
  alertas: AlertTriangle,
};

const demoNotifications = [
  {
    id: '1',
    type: 'convites' as NotificationType,
    unread: true,
    message: 'Você convidou joao@empresa.com para colaborar.',
    timestamp: 'há 5 minutos',
  },
  {
    id: '2',
    type: 'documentos' as NotificationType,
    unread: true,
    message: 'Maria editou a planilha de Skills - Matriz de Riscos.',
    timestamp: 'há 18 minutos',
  },
  {
    id: '3',
    type: 'sistema' as NotificationType,
    unread: false,
    message: 'Novo relatório de compliance gerado automaticamente.',
    timestamp: 'hoje às 09:12',
  },
  {
    id: '4',
    type: 'convites' as NotificationType,
    unread: false,
    message: 'Convite aceito por ana@empresa.com.',
    timestamp: 'ontem',
  },
  {
    id: '5',
    type: 'sistema' as NotificationType,
    unread: true,
    message: 'Seu plano foi atualizado para Enterprise.',
    timestamp: 'ontem às 16:40',
  },
  {
    id: '6',
    type: 'alertas' as NotificationType,
    unread: true,
    message: 'Uma evidência crítica está próxima da data de revisão.',
    timestamp: 'segunda-feira',
  },
  {
    id: '7',
    type: 'documentos' as NotificationType,
    unread: false,
    message: 'Documento “Política de Retenção” foi marcado como aprovado.',
    timestamp: 'semana passada',
  },
];

const filters: { label: string; value: Filter }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Não lidas', value: 'nao-lidas' },
  { label: 'Convites', value: 'convites' },
  { label: 'Documentos', value: 'documentos' },
  { label: 'Sistema', value: 'sistema' },
  { label: 'Alertas', value: 'alertas' },
];

export default function NotificationsPage({ params }: { params: { locale: string } }) {
  const [activeFilter, setActiveFilter] = useState<Filter>('todas');
  const [notifications, setNotifications] = useState(demoNotifications);

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={params.locale} activePage="Notificações" />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8 md:py-12">
        <section className="overflow-hidden rounded-[2rem] border bg-background/88 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge className="gap-2 rounded-full px-3 py-1 uppercase tracking-[0.18em]"><Bell className="h-3.5 w-3.5" /> Notificações premium</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Feed de atividades da equipa.</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">Histórico cronológico de convites, documentos, alertas e sinais do sistema para manter a operação explicável.</p>
            </div>
            <div className="rounded-3xl border bg-muted/30 p-4 text-center">
              <p className="text-3xl font-semibold">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">não lidas</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border bg-background/88 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${activeFilter === filter.value ? 'border-primary bg-primary text-primary-foreground shadow-lg' : 'bg-background hover:bg-muted'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <Button type="button" onClick={markAllAsRead} className="rounded-full"><CheckCircle2 className="h-4 w-4" /> Marcar todas como lidas</Button>
          </div>
        </section>

        <section className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = iconMap[notification.type];
            return (
              <article key={notification.id} className="group rounded-[1.5rem] border bg-background/90 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${notification.unread ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-6">{notification.message}</p>
                        <Badge variant={notification.unread ? 'default' : 'outline'} className="rounded-full">{notification.unread ? 'não lida' : 'lida'}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.timestamp}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => toggleRead(notification.id)} className="rounded-full border px-3 py-2 text-sm text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                    {notification.unread ? 'Marcar como lida' : 'Marcar como não lida'}
                  </button>
                </div>
              </article>
            );
          })}

          {filteredNotifications.length === 0 ? (
            <div className="rounded-[2rem] border bg-background/88 p-8 text-center text-muted-foreground">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-medium">Nada neste filtro agora.</p>
              <p className="mt-1 text-sm">Troque o filtro ou volte ao Command Center.</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border bg-foreground p-6 text-background shadow-xl shadow-primary/10 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Enterprise mantém histórico para toda a equipa.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-background/75">Faça upgrade e tenha histórico de notificações para toda equipe, convites colaborativos e trilha de decisões mais clara para auditoria.</p>
          <Button asChild className="mt-5 rounded-full bg-background text-foreground hover:bg-background/90">
            <Link href={`/${params.locale}/pricing`}>Comparar planos</Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
