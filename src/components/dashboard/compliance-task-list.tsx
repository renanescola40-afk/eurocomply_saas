'use client';

import { useState } from 'react';

import { DeleteRecordButton } from '@/components/shared/delete-record-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function TaskRow({ locale, task, onDelete, onComplete, onEdit }: {
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
      await onEdit(task.id, { title: title.trim(), description: description.trim() || undefined, category: category.trim() || undefined, priority, dueDate: dueDate || null });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : actionCopy.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border p-3" data-task-id={task.id}>
      {editing ? (
        <div className="space-y-3" aria-busy={saving}>
          <label className="block text-sm font-medium">{copy.titleLabel}<input aria-label={copy.titleLabel} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 focus-visible:ring-2" required /></label>
          <label className="block text-sm font-medium">{copy.descriptionLabel}<textarea aria-label={copy.descriptionLabel} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 focus-visible:ring-2" /></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium">{copy.categoryLabel}<input aria-label={copy.categoryLabel} value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 focus-visible:ring-2" /></label>
            <label className="block text-sm font-medium">{copy.priorityLabel}<select aria-label={copy.priorityLabel} value={priority} onChange={(event) => setPriority(event.target.value as EditComplianceTaskInput['priority'])} className="mt-1 w-full rounded-md border bg-background px-3 py-2 focus-visible:ring-2">{(['low', 'medium', 'high', 'critical'] as const).map((value) => <option key={value} value={value}>{copy.priorities[value]}</option>)}</select></label>
            <label className="block text-sm font-medium">{copy.dueDateLabel}<input aria-label={copy.dueDateLabel} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 focus-visible:ring-2" /></label>
          </div>
          {error ? <p className="text-sm text-red-500" role="alert" aria-live="assertive">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void save()} disabled={saving || !title.trim()} className="focus-visible:ring-2">{saving ? actionCopy.saving : actionCopy.save}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(false); setError(null); }} disabled={saving} className="focus-visible:ring-2">{actionCopy.cancel}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="break-words font-medium">{task.title}</p>
            {task.description ? <p className="mt-1 break-words text-sm text-muted-foreground">{task.description}</p> : null}
            <p className="mt-1 text-sm text-muted-foreground">{copy.due} {formatDueDate(task.due_date, locale, copy.noDueDate, copy.invalidDueDate)}</p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs uppercase tracking-wide text-muted-foreground sm:items-end sm:text-right">
            <div><p>{task.priority ? copy.priorities[task.priority as keyof typeof copy.priorities] ?? task.priority : copy.priorities.medium}</p><p>{task.status ?? 'todo'}</p></div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {onEdit ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-full text-xs normal-case tracking-normal focus-visible:ring-2" onClick={() => setEditing(true)}>{actionCopy.edit}</Button> : null}
              {onComplete && !isDone ? <form action={onComplete.bind(null, task.id)}><Button type="submit" variant="outline" size="sm" className="h-8 rounded-full text-xs normal-case tracking-normal focus-visible:ring-2">{copy.markDone}</Button></form> : null}
              {onDelete ? <DeleteRecordButton id={task.id} label={task.title} resourceName="task" onDelete={onDelete} copy={{ delete: copy.delete, deleting: copy.deleting, confirm: copy.deleteConfirm, error: copy.deleteError }} /> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ComplianceTaskList({ locale, tasks, onDelete, onComplete, onEdit }: ComplianceTaskListProps) {
  const copy = getCoreWorkflowCopy(locale).tasks;
  return (
    <Card>
      <CardHeader><CardTitle>{copy.listTitle}</CardTitle></CardHeader>
      <CardContent>
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground" role="status">{copy.empty}</p> : <div className="space-y-3">{tasks.map((task) => <TaskRow key={task.id} locale={locale} task={task} onDelete={onDelete} onComplete={onComplete} onEdit={onEdit} />)}</div>}
      </CardContent>
    </Card>
  );
}
