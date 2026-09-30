'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, ListChecks } from 'lucide-react';

type ComplianceTask = {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  due_date?: string | null;
};

type CalendarTask = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  dueDate: string | null;
};

function humanize(value: string | null | undefined, fallback = 'Not set') {
  if (!value) return fallback;
  return value.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeTask(task: ComplianceTask): CalendarTask {
  return {
    id: task.id,
    title: task.title?.trim() || 'Untitled compliance task',
    description: task.description?.trim() || '',
    category: humanize(task.category, 'Compliance'),
    priority: humanize(task.priority, 'Medium'),
    status: humanize(task.status, 'Todo'),
    dueDate: task.due_date ?? null,
  };
}

function monthKey(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function priorityClass(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === 'critical') return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-100';
  if (normalized === 'high') return 'border-amber-400/20 bg-amber-400/[0.08] text-amber-100';
  if (normalized === 'low') return 'border-slate-700 bg-slate-800/60 text-slate-300';
  return 'border-blue-400/20 bg-blue-400/[0.08] text-blue-100';
}

export default function ComplianceCalendarClient({ locale, plan, tasks }: { locale: string; plan: string; tasks: ComplianceTask[] }) {
  const normalizedTasks = useMemo(() => tasks.map(normalizeTask), [tasks]);
  const monthOptions = useMemo(() => Array.from(new Set(normalizedTasks.map((task) => monthKey(task.dueDate)).filter(Boolean) as string[])).sort(), [normalizedTasks]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const visibleTasks = useMemo(() => selectedMonth === 'all' ? normalizedTasks : normalizedTasks.filter((task) => monthKey(task.dueDate) === selectedMonth), [normalizedTasks, selectedMonth]);
  const pendingCount = normalizedTasks.filter((task) => task.status.toLowerCase() !== 'done').length;
  const completedCount = normalizedTasks.filter((task) => task.status.toLowerCase() === 'done').length;
  const datedCount = normalizedTasks.filter((task) => Boolean(task.dueDate)).length;

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-[#0b121e] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Compliance calendar</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Compliance deadlines</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Organization-scoped compliance tasks with real due dates. The calendar does not fabricate regulatory deadlines or simulated AI findings.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Plan: {humanize(plan)}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="h-10 rounded-lg border border-slate-700 bg-[#0d1624] px-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" aria-label="Filter compliance tasks by month">
              <option value="all">All due dates</option>
              {monthOptions.map((key) => <option key={key} value={key}>{key}</option>)}
            </select>
            <Link href={`/${locale}/dashboard/organizations/tasks`} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Manage tasks</Link>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-[#0b121e] p-5"><Clock3 className="h-5 w-5 text-amber-300" aria-hidden="true" /><p className="mt-3 text-3xl font-semibold">{pendingCount}</p><p className="mt-1 text-sm text-slate-400">Open tasks</p></article>
        <article className="rounded-xl border border-slate-800 bg-[#0b121e] p-5"><CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" /><p className="mt-3 text-3xl font-semibold">{completedCount}</p><p className="mt-1 text-sm text-slate-400">Completed tasks</p></article>
        <article className="rounded-xl border border-slate-800 bg-[#0b121e] p-5"><CalendarDays className="h-5 w-5 text-blue-300" aria-hidden="true" /><p className="mt-3 text-3xl font-semibold">{datedCount}</p><p className="mt-1 text-sm text-slate-400">Tasks with due dates</p></article>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-[#0b121e] p-8 text-center">
          <ListChecks className="mx-auto h-6 w-6 text-slate-500" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-400">No compliance tasks match this calendar view.</p>
          <Link href={`/${locale}/dashboard/organizations/tasks`} className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-semibold text-slate-100 hover:bg-slate-800">Open task management</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]">
          <div className="divide-y divide-slate-800">
            {visibleTasks.map((task) => (
              <article key={task.id} className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-100">{task.title}</h2>
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{task.category} · {task.status}</p>
                  {task.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{task.description}</p> : null}
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Due date</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">{task.dueDate ? new Date(`${task.dueDate.slice(0, 10)}T12:00:00`).toLocaleDateString(locale) : 'Not scheduled'}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
