'use client';

import { useState } from 'react';

import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';

export type CreateComplianceTaskFormInput = {
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
};

type Props = {
  locale: string;
  onSubmit: (input: CreateComplianceTaskFormInput) => Promise<void> | void;
};

export function CreateComplianceTaskForm({ locale, onSubmit }: Props) {
  const copy = getCoreWorkflowCopy(locale).tasks;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GDPR');
  const [priority, setPriority] = useState<CreateComplianceTaskFormInput['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({ title, description, category, priority, dueDate: dueDate || undefined });
      setTitle('');
      setDescription('');
      setCategory('GDPR');
      setPriority('medium');
      setDueDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.createError);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClassName = 'mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-300/40';

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white" aria-busy={isSubmitting}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{copy.formTitle}</h2>
        <p className="mt-1 text-sm text-white/55">{copy.formSubtitle}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label htmlFor="compliance-task-title" className="md:col-span-2 text-sm text-white/70">
          {copy.titleLabel}
          <input id="compliance-task-title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} className={inputClassName} placeholder={copy.titlePlaceholder} />
        </label>

        <label htmlFor="compliance-task-description" className="md:col-span-2 text-sm text-white/70">
          {copy.descriptionLabel}
          <textarea id="compliance-task-description" value={description} onChange={(event) => setDescription(event.target.value)} className={inputClassName} placeholder={copy.descriptionPlaceholder} />
        </label>

        <label htmlFor="compliance-task-category" className="text-sm text-white/70">
          {copy.categoryLabel}
          <input id="compliance-task-category" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName} />
        </label>

        <label htmlFor="compliance-task-priority" className="text-sm text-white/70">
          {copy.priorityLabel}
          <select id="compliance-task-priority" value={priority} onChange={(event) => setPriority(event.target.value as CreateComplianceTaskFormInput['priority'])} className={inputClassName}>
            {(['low', 'medium', 'high', 'critical'] as const).map((value) => <option key={value} value={value}>{copy.priorities[value]}</option>)}
          </select>
        </label>

        <label htmlFor="compliance-task-due-date" className="text-sm text-white/70">
          {copy.dueDateLabel}
          <input id="compliance-task-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClassName} />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-300" role="alert" aria-live="assertive">{error}</p> : null}

      <button type="submit" disabled={isSubmitting || !title.trim()} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50">
        {isSubmitting ? copy.creating : copy.create}
      </button>
    </form>
  );
}
