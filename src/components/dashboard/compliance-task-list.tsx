'use client';

import { Fragment, useState } from 'react';

import { DeleteRecordButton } from '@/components/shared/delete-record-button';
import { Button } from '@/components/ui/button';
import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';
import { locales, type Locale } from '@/lib/i18n/routing';

type ComplianceTask = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
};

export type EditComplianceTaskInput = {
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string | null;
};

type ComplianceTaskListProps = {
  locale: string;
  tasks: ComplianceTask[];
  onDelete?: (taskId: string) => Promise<void>;
  onComplete?: (taskId: string) => Promise<void>;
  onEdit?: (taskId: string, input: EditComplianceTaskInput) => Promise<void>;
};

const editCopy: Record<Locale, { edit: string; save: string; saving: string; cancel: string; error: string }> = {
  en: { edit: 'Edit', save: 'Save changes', saving: 'Saving...', cancel: 'Cancel', error: 'Could not update task.' },
  pt: { edit: 'Editar', save: 'Guardar alterações', saving: 'A guardar...', cancel: 'Cancelar', error: 'Não foi possível atualizar a tarefa.' },
  es: { edit: 'Editar', save: 'Guardar cambios', saving: 'Guardando...', cancel: 'Cancelar', error: 'No se pudo actualizar la tarea.' },
  fr: { edit: 'Modifier', save: 'Enregistrer', saving: 'Enregistrement...', cancel: 'Annuler', error: 'Impossible de mettre à jour la tâche.' },
  it: { edit: 'Modifica', save: 'Salva modifiche', saving: 'Salvataggio...', cancel: 'Annulla', error: 'Impossibile aggiornare l’attività.' },
  de: { edit: 'Bearbeiten', save: 'Änderungen speichern', saving: 'Wird gespeichert...', cancel: 'Abbrechen', error: 'Aufgabe konnte nicht aktualisiert werden.' },
};

function formatDueDate(value: string | null | undefined, locale: string, noDueDate: string, invalidDueDate: string) {
  if (!value) return noDueDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return invalidDueDate;
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function priorityTone(priority?: string | null) {
  if (priority === 'critical') return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
  if (priority === 'high') return 'border-amber-400/25 bg-amber-400/10 text-amber-300';
  if (priority === 'medium') return 'border-blue-400/20 bg-blue-400/[0.07] text-blue-300';
  return 'border-slate-700 bg-slate-900/60 text-slate-400';
}

function statusTone(status?: string | null) {
  if (status === 'done') return 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300';
  if (status === 'in_progress') return 'border-blue-400/20 bg-blue-400/[0.07] text-blue-300';
  return 'border-slate-700 bg-slate-900/60 text-slate-400';
}

function TaskRows({ locale, task, onDelete, onComplete, onEdit }: {
  locale: string;
  task: ComplianceTask;
  onDelete?: (taskId: string) => Promise<void>;
  onComplete?: (taskId: string) => Promise<void>;
  onEdit?: (taskId: string, input: EditComplianceTaskInput) => Promise<void>;
}) {
  const copy = getCoreWorkflowCopy(locale).tasks;
  const safeLocale = locales.includes(locale as Locale) ? (locale as Locale) : 'en';
  const actionCopy = editCopy[safeLocale];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [category, setCategory] = useState(task.category ?? 'GDPR');
  const [priority, setPriority] = useState<EditComplianceTaskInput['priority']>((task.priority as EditComplianceTaskInput['priority']) ?? 'medium');
  const [dueDate, setDueDate] = useState(task.due_date?.slice(0, 10) ?? '');
  const isDone = task.status === 'done';

  async function save() {
    if (!onEdit || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onEdit(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        priority,
        dueDate: dueDate || null,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : actionCopy.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Fragment>
      <tr data-task-id={task.id} className="bg-[#0b121e] transition hover:bg-[#0e1827]">
        <td className="px-5 py-4 sm:px-6">
          <p className="max-w-[360px] truncate text-sm font-semibold text-slate-100">{task.title}</p>
          <p className="mt-1 max-w-[360px] truncate text-xs text-slate-600">{task.description || '—'}</p>
        </td>
        <td className="px-4 py-4 text-xs text-slate-400">{task.category || '—'}</td>
        <td className="px-4 py-4">
          <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${priorityTone(task.priority)}`}>
            {task.priority ? copy.priorities[task.priority as keyof typeof copy.priorities] ?? task.priority : copy.priorities.medium}
          </span>
        </td>
        <td className="px-4 py-4 font-mono text-[11px] tabular-nums text-slate-500">
          {formatDueDate(task.due_date, locale, copy.noDueDate, copy.invalidDueDate)}
        </td>
        <td className="px-4 py-4">
          <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(task.status)}`}>
            {task.status ?? 'todo'}
          </span>
        </td>
        <td className="px-5 py-4 sm:px-6">
          <div className="flex flex-wrap justify-end gap-2">
            {onEdit ? (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-md border-slate-700 bg-transparent text-xs text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:ring-2" onClick={() => setEditing(true)}>
                {actionCopy.edit}
              </Button>
            ) : null}
            {onComplete && !isDone ? (
              <form action={onComplete.bind(null, task.id)}>
                <Button type="submit" variant="outline" size="sm" className="h-8 rounded-md border-emerald-500/20 bg-emerald-500/[0.05] text-xs text-emerald-300 hover:bg-emerald-500/10 focus-visible:ring-2">
                  {copy.markDone}
                </Button>
              </form>
            ) : null}
            {onDelete ? (
              <DeleteRecordButton id={task.id} label={task.title} resourceName="task" onDelete={onDelete} copy={{ delete: copy.delete, deleting: copy.deleting, confirm: copy.deleteConfirm, error: copy.deleteError }} />
            ) : null}
          </div>
        </td>
      </tr>

      {editing ? (
        <tr className="border-t border-blue-500/20 bg-[#09111d]">
          <td colSpan={6} className="px-5 py-5 sm:px-6">
            <div className="space-y-4" aria-busy={saving}>
              <div className="grid gap-3 lg:grid-cols-2">
                <label className="block text-xs font-medium text-slate-400">
                  {copy.titleLabel}
                  <input aria-label={copy.titleLabel} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-200 outline-none focus:border-blue-500/60 focus-visible:ring-2" required />
                </label>
                <label className="block text-xs font-medium text-slate-400">
                  {copy.categoryLabel}
                  <input aria-label={copy.categoryLabel} value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-200 outline-none focus:border-blue-500/60 focus-visible:ring-2" />
                </label>
              </div>
              <label className="block text-xs font-medium text-slate-400">
                {copy.descriptionLabel}
                <textarea aria-label={copy.descriptionLabel} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/60 focus-visible:ring-2" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-400">
                  {copy.priorityLabel}
                  <select aria-label={copy.priorityLabel} value={priority} onChange={(event) => setPriority(event.target.value as EditComplianceTaskInput['priority'])} className="mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-200 outline-none focus:border-blue-500/60 focus-visible:ring-2">
                    {(['low', 'medium', 'high', 'critical'] as const).map((value) => <option key={value} value={value}>{copy.priorities[value]}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-400">
                  {copy.dueDateLabel}
                  <input aria-label={copy.dueDateLabel} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-200 outline-none focus:border-blue-500/60 focus-visible:ring-2" />
                </label>
              </div>
              {error ? <p className="text-sm text-rose-400" role="alert" aria-live="assertive">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void save()} disabled={saving || !title.trim()} className="rounded-md bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-2">
                  {saving ? actionCopy.saving : actionCopy.save}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(false); setError(null); }} disabled={saving} className="rounded-md border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:ring-2">
                  {actionCopy.cancel}
                </Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

export function ComplianceTaskList({ locale, tasks, onDelete, onComplete, onEdit }: ComplianceTaskListProps) {
  const copy = getCoreWorkflowCopy(locale).tasks;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-labelledby="compliance-task-list-title">
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
        <div>
          <h2 id="compliance-task-list-title" className="text-sm font-semibold text-slate-100">{copy.listTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">Operational work queue with priority, due date, status and governed actions.</p>
        </div>
        <span className="rounded-md border border-slate-800 bg-[#0d1624] px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-slate-400">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500" role="status">{copy.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full border-collapse text-left">
            <thead className="bg-[#080e18]">
              <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                <th className="px-5 py-3 sm:px-6">Task</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {tasks.map((task) => (
                <TaskRows key={task.id} locale={locale} task={task} onDelete={onDelete} onComplete={onComplete} onEdit={onEdit} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
