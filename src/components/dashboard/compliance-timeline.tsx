import Link from 'next/link';

type TimelineTask = {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
};

type TimelineVendor = {
  id: string;
  name?: string | null;
  risk_level?: string | null;
  review_status?: string | null;
  next_review_at?: string | null;
};

type TimelineDocument = {
  id: string;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  expires_at?: string | null;
  category?: string | null;
};

type ComplianceTimelineProps = {
  tasks: TimelineTask[];
  vendors: TimelineVendor[];
  documents: TimelineDocument[];
  basePath: string;
};

type TimelineItem = {
  id: string;
  type: 'Task' | 'Vendor review' | 'Document expiry';
  title: string;
  date: string | null;
  detail: string;
  href: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Normal';
};

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getRelativeDate(value?: string | null) {
  const days = getDaysUntil(value);

  if (days === null) return 'Schedule needed';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

function getPriorityTone(priority: TimelineItem['priority']) {
  switch (priority) {
    case 'Critical':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'High':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'Medium':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
    default:
      return 'border-white/10 bg-white/[0.04] text-slate-300';
  }
}

function buildTimeline({ tasks, vendors, documents, basePath }: ComplianceTimelineProps): TimelineItem[] {
  const taskItems = tasks
    .filter((task) => task.status !== 'done')
    .map((task) => ({
      id: `task-${task.id}`,
      type: 'Task' as const,
      title: task.title ?? 'Untitled task',
      date: task.due_date ?? null,
      detail: `${task.priority ?? 'normal'} priority · ${task.status ?? 'open'}`,
      href: `${basePath}/tasks`,
      priority: task.priority === 'urgent' || task.priority === 'high' ? 'High' as const : 'Normal' as const,
    }));

  const vendorItems = vendors.map((vendor) => ({
    id: `vendor-${vendor.id}`,
    type: 'Vendor review' as const,
    title: vendor.name ?? 'Unnamed vendor',
    date: vendor.next_review_at ?? null,
    detail: `${vendor.risk_level ?? 'unknown'} risk · ${vendor.review_status ?? 'pending'}`,
    href: `${basePath}/vendors`,
    priority: vendor.risk_level === 'high' ? 'High' as const : 'Medium' as const,
  }));

  const documentItems = documents.map((document) => ({
    id: `document-${document.id}`,
    type: 'Document expiry' as const,
    title: document.title ?? document.name ?? 'Untitled document',
    date: document.expires_at ?? null,
    detail: `${document.category ?? 'General'} · ${document.status ?? 'draft'}`,
    href: `${basePath}/documents`,
    priority: getDaysUntil(document.expires_at) !== null && (getDaysUntil(document.expires_at) ?? 999) <= 7 ? 'Critical' as const : 'Medium' as const,
  }));

  return [...taskItems, ...vendorItems, ...documentItems]
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .slice(0, 8);
}

export function ComplianceTimeline(props: ComplianceTimelineProps) {
  const items = buildTimeline(props);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-xl md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/80">Compliance calendar</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Upcoming deadlines and reviews</h2>
        </div>
        <p className="max-w-xl text-sm text-slate-400">
          A single view of operational work, vendor reviews and evidence deadlines.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          No upcoming deadlines found. Add due dates, document expiry dates and vendor review dates to build your compliance calendar.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="group rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/[0.07]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.type}</p>
                  <h3 className="mt-2 font-semibold leading-tight text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityTone(item.priority)}`}>
                  {item.priority}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
                <span className="text-slate-300">{formatDate(item.date)}</span>
                <span className="text-primary/90 transition group-hover:text-primary">{getRelativeDate(item.date)} →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
