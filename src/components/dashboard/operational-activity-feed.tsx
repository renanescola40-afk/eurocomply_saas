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
  type: 'task' | 'risk' | 'vendor' | 'document';
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
      return 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80';
    case 'high':
      return 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80';
    case 'medium':
      return 'border-white/[0.075] bg-white/[0.025] text-white/55';
    default:
      return 'border-white/[0.075] bg-transparent text-white/42';
  }
}

function typeLabel(type: ActivityItem['type']) {
  const labels = {
    task: 'Task',
    risk: 'Risk',
    vendor: 'Vendor',
    document: 'Document',
  };
  return labels[type];
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

  return [...riskItems, ...vendorItems, ...documentItems, ...taskItems].slice(0, 12);
}

export function OperationalActivityFeed(props: OperationalActivityFeedProps) {
  const items = buildActivityItems(props);
  const groups: ActivityItem['group'][] = ['Today', 'This week', 'Upcoming'];

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/55">Operational feed</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Compliance activity</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/38">Prioritized from current risks, vendors, documents and open tasks. No placeholder activity is added.</p>
      </div>

      <div className="grid lg:grid-cols-3 lg:divide-x lg:divide-white/[0.055]">
        {groups.map((group, groupIndex) => {
          const groupItems = items.filter((item) => item.group === group);
          return (
            <div key={group} className={`${groupIndex > 0 ? 'border-t border-white/[0.055] lg:border-t-0' : ''}`}>
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.055] px-5 py-3.5">
                <h3 className="text-sm font-semibold text-white/72">{group}</h3>
                <span className="text-xs tabular-nums text-white/34">{groupItems.length}</span>
              </div>

              <div className="divide-y divide-white/[0.055]">
                {groupItems.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-white/32">No activity in this lane.</p>
                ) : groupItems.map((item) => (
                  <Link key={item.id} href={item.href} className="group block px-5 py-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/35">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${severityTone(item.severity)}`}>{typeLabel(item.type)}</span>
                          <p className="truncate text-sm font-semibold text-white/80">{item.title}</p>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-white/38">{item.description}</p>
                      </div>
                      <span className="shrink-0 text-xs text-emerald-100/0 transition group-hover:text-emerald-100/65">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
