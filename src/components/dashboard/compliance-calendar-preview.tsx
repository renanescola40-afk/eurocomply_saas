import Link from 'next/link';

type CalendarTask = {
  id: string;
  title?: string | null;
  due_date?: string | null;
  priority?: string | null;
};

type CalendarVendor = {
  id: string;
  name?: string | null;
  next_review_at?: string | null;
  risk_level?: string | null;
};

type CalendarDocument = {
  id: string;
  title?: string | null;
  name?: string | null;
  expires_at?: string | null;
  category?: string | null;
};

type ComplianceCalendarPreviewProps = {
  tasks: CalendarTask[];
  vendors: CalendarVendor[];
  documents: CalendarDocument[];
  basePath: string;
};

type CalendarItem = {
  id: string;
  type: 'Task' | 'Vendor review' | 'Document expiry';
  title: string;
  date: string | null;
  detail: string;
  href: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
};

function parseTime(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  return new Date(value).getTime();
}

function formatDate(value: string | null) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function getPriorityTone(priority: CalendarItem['priority']) {
  if (priority === 'Critical') return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  if (priority === 'High') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (priority === 'Medium') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
}

function buildItems(input: ComplianceCalendarPreviewProps): CalendarItem[] {
  const taskItems = input.tasks
    .filter((task) => task.due_date)
    .map((task) => ({
      id: `task-${task.id}`,
      type: 'Task' as const,
      title: task.title ?? 'Untitled task',
      date: task.due_date ?? null,
      detail: `${task.priority ?? 'normal'} priority task`,
      href: `${input.basePath}/tasks`,
      priority: task.priority === 'urgent' || task.priority === 'high' ? 'High' as const : 'Medium' as const,
    }));

  const vendorItems = input.vendors
    .filter((vendor) => vendor.next_review_at)
    .map((vendor) => ({
      id: `vendor-${vendor.id}`,
      type: 'Vendor review' as const,
      title: vendor.name ?? 'Unnamed vendor',
      date: vendor.next_review_at ?? null,
      detail: `${vendor.risk_level ?? 'unknown'} risk vendor`,
      href: `${input.basePath}/vendors`,
      priority: vendor.risk_level === 'critical' || vendor.risk_level === 'high' ? 'Critical' as const : 'Medium' as const,
    }));

  const documentItems = input.documents
    .filter((document) => document.expires_at)
    .map((document) => ({
      id: `document-${document.id}`,
      type: 'Document expiry' as const,
      title: document.title ?? document.name ?? 'Untitled document',
      date: document.expires_at ?? null,
      detail: `${document.category ?? 'General'} evidence`,
      href: `${input.basePath}/documents`,
      priority: 'High' as const,
    }));

  return [...taskItems, ...vendorItems, ...documentItems]
    .sort((a, b) => parseTime(a.date) - parseTime(b.date))
    .slice(0, 6);
}

export function ComplianceCalendarPreview(props: ComplianceCalendarPreviewProps) {
  const items = buildItems(props);

  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Compliance calendar</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Upcoming reviews and deadlines</h2>
        </div>
        <Link href={`${props.basePath}/tasks`} className="text-sm font-medium text-primary hover:underline">
          Open task register →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
          No dated compliance events yet. Add task due dates, document expirations or vendor review dates to populate the calendar.
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="group rounded-2xl border p-4 transition hover:border-primary/50 hover:bg-muted/40">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{item.type}</span>
                <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getPriorityTone(item.priority)}`}>{item.priority}</span>
              </div>
              <h3 className="mt-3 font-semibold leading-tight">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              <p className="mt-4 text-sm font-medium text-primary">{formatDate(item.date)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
