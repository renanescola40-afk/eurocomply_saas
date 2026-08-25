import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

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
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
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
      return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-100';
    case 'High':
      return 'border-amber-300/20 bg-amber-300/[0.08] text-amber-100';
    case 'Medium':
      return 'border-sky-300/20 bg-sky-300/[0.07] text-sky-100';
    default:
      return 'border-white/[0.08] bg-white/[0.025] text-white/48';
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
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.065] px-5 py-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/34">Compliance calendar</p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white/86">Upcoming deadlines and reviews</h2>
        </div>
        <p className="max-w-xl text-xs leading-5 text-white/34">
          Operational work, vendor reviews and evidence deadlines in one queue.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="m-5 rounded-lg border border-dashed border-white/[0.09] bg-white/[0.018] px-4 py-6 text-sm text-white/38">
          No upcoming deadlines found. Add due dates, document expiry dates and vendor review dates to build your compliance calendar.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.055]">
          <div className="hidden grid-cols-[130px_minmax(0,1fr)_180px_110px_36px] gap-4 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/24 lg:grid">
            <span>Type</span>
            <span>Item</span>
            <span>Due</span>
            <span>Priority</span>
            <span aria-hidden="true" />
          </div>

          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group grid gap-3 px-5 py-4 transition-colors duration-200 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/60 lg:grid-cols-[130px_minmax(0,1fr)_180px_110px_36px] lg:items-center lg:gap-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-white/30">{item.type}</p>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium text-white/76">{item.title}</h3>
                <p className="mt-1 truncate text-xs text-white/30">{item.detail}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 lg:block">
                <span className="text-xs font-medium text-white/58">{formatDate(item.date)}</span>
                <span className="text-xs text-white/30 lg:mt-1 lg:block">{getRelativeDate(item.date)}</span>
              </div>
              <div>
                <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${getPriorityTone(item.priority)}`}>
                  {item.priority}
                </span>
              </div>
              <span className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/25 transition group-hover:border-white/[0.1] group-hover:text-white/65 lg:flex" aria-hidden="true">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
