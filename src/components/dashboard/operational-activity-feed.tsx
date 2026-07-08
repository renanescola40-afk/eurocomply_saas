import Link from 'next/link';

type ActivityTask = {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
};

type ActivityRisk = {
  id: string;
  title?: string | null;
  status?: string | null;
  risk_score?: number | string | null;
  category?: string | null;
};

type ActivityVendor = {
  id: string;
  name?: string | null;
  risk_level?: string | null;
  review_status?: string | null;
  next_review_at?: string | null;
};

type ActivityDocument = {
  id: string;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  expires_at?: string | null;
  category?: string | null;
};

type OperationalActivityFeedProps = {
  tasks: ActivityTask[];
  topRisks: ActivityRisk[];
  vendors: ActivityVendor[];
  documents: ActivityDocument[];
  basePath: string;
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  group: 'Today' | 'This week' | 'Upcoming';
  type: 'task' | 'risk' | 'vendor' | 'document' | 'report';
  href: string;
  severity: 'critical' | 'high' | 'medium' | 'normal';
};

function daysUntil(value?: string | null) {
  if (!value) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function getGroupFromDate(value?: string | null): ActivityItem['group'] {
  const days = daysUntil(value);
  if (days === null) return 'Upcoming';
  if (days <= 0) return 'Today';
  if (days <= 7) return 'This week';
  return 'Upcoming';
}

function formatDue(value?: string | null) {
  const days = daysUntil(value);
  if (days === null) return 'No deadline set';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

function severityTone(severity: ActivityItem['severity']) {
  switch (severity) {
    case 'critical':
      return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
    case 'high':
      return 'border-amber-300/30 bg-amber-300/10 text-amber-200';
    case 'medium':
      return 'border-sky-300/30 bg-sky-300/10 text-sky-200';
    default:
      return 'border-white/10 bg-white/[0.04] text-slate-300';
  }
}

function typeIcon(type: ActivityItem['type']) {
  const icons = {
    task: '↳',
    risk: '◆',
    vendor: '◇',
    document: '◻',
    report: '◎',
  };

  return icons[type];
}

function buildActivityItems({ tasks, topRisks, vendors, documents, basePath }: OperationalActivityFeedProps): ActivityItem[] {
  const taskItems = tasks
    .filter((task) => task.status !== 'done')
    .slice(0, 4)
    .map((task): ActivityItem => ({
      id: `task-${task.id}`,
      title: task.title ?? 'Untitled task',
      description: `${formatDue(task.due_date)} · ${task.priority ?? 'normal'} priority`,
      group: getGroupFromDate(task.due_date),
      type: 'task',
      href: `${basePath}/tasks`,
      severity: task.priority === 'urgent' || task.priority === 'high' ? 'high' : 'normal',
    }));

  const riskItems = topRisks.slice(0, 3).map((risk): ActivityItem => {
    const score = Number(risk.risk_score ?? 0);
    return {
      id: `risk-${risk.id}`,
      title: risk.title ?? 'Untitled risk',
      description: `${risk.category ?? 'General'} · risk score ${score}`,
      group: score >= 16 ? 'Today' : 'This week',
      type: 'risk',
      href: `${basePath}/risks`,
      severity: score >= 16 ? 'critical' : score >= 9 ? 'high' : 'medium',
    };
  });

  const vendorItems = vendors.slice(0, 3).map((vendor): ActivityItem => ({
    id: `vendor-${vendor.id}`,
    title: vendor.name ?? 'Unnamed vendor',
    description: `${formatDue(vendor.next_review_at)} · ${vendor.review_status ?? 'pending'} review`,
    group: getGroupFromDate(vendor.next_review_at),
    type: 'vendor',
    href: `${basePath}/vendors`,
    severity: vendor.risk_level === 'high' ? 'high' : 'medium',
  }));

  const documentItems = documents.slice(0, 3).map((document): ActivityItem => {
    const days = daysUntil(document.expires_at);
    return {
      id: `document-${document.id}`,
      title: document.title ?? document.name ?? 'Untitled document',
      description: `${formatDue(document.expires_at)} · ${document.category ?? 'General'}`,
      group: getGroupFromDate(document.expires_at),
      type: 'document',
      href: `${basePath}/documents`,
      severity: days !== null && days <= 7 ? 'critical' : 'medium',
    };
  });

  const reportItem: ActivityItem = {
    id: 'report-ready',
    title: 'Executive report ready to export',
    description: 'Generate a leadership review compliance snapshot',
    group: 'Upcoming',
    type: 'report',
    href: `${basePath}/reports`,
    severity: 'normal',
  };

  return [...riskItems, ...vendorItems, ...documentItems, ...taskItems, reportItem].slice(0, 12);
}

export function OperationalActivityFeed(props: OperationalActivityFeedProps) {
  const items = buildActivityItems(props);
  const groups: ActivityItem['group'][] = ['Today', 'This week', 'Upcoming'];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Operational feed</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Compliance activity timeline</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          A Linear-style operating feed generated from risks, vendors, documents and tasks that need attention.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.group === group);

          return (
            <div key={group} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{group}</h3>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-400">{groupItems.length}</span>
              </div>

              <div className="mt-4 space-y-3">
                {groupItems.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No activity in this lane.</p>
                ) : (
                  groupItems.map((item) => (
                    <Link key={item.id} href={item.href} className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/50 hover:bg-white/[0.06]">
                      <div className="flex items-start gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm ${severityTone(item.severity)}`}>
                          {typeIcon(item.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
                          <p className="mt-2 text-xs text-primary/80 opacity-0 transition group-hover:opacity-100">Open workstream →</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
