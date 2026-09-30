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

  const inputClassName = 'mt-1.5 min-h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20';
  const labelClassName = 'text-xs font-medium text-slate-400';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 text-white sm:p-6" aria-busy={isSubmitting}>
      <div className="mb-5 border-b border-slate-800 pb-4">
        <h2 className="text-sm font-semibold text-slate-100">{copy.formTitle}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">{copy.formSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label htmlFor="compliance-task-title" className={`md:col-span-2 ${labelClassName}`}>
          {copy.titleLabel}
          <input id="compliance-task-title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} className={inputClassName} placeholder={copy.titlePlaceholder} />
        </label>

        <label htmlFor="compliance-task-description" className={`md:col-span-2 ${labelClassName}`}>
          {copy.descriptionLabel}
          <textarea id="compliance-task-description" value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClassName} min-h-24 resize-y`} placeholder={copy.descriptionPlaceholder} />
        </label>

        <label htmlFor="compliance-task-category" className={labelClassName}>
          {copy.categoryLabel}
          <input id="compliance-task-category" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName} />
        </label>

        <label htmlFor="compliance-task-priority" className={labelClassName}>
          {copy.priorityLabel}
          <select id="compliance-task-priority" value={priority} onChange={(event) => setPriority(event.target.value as CreateComplianceTaskFormInput['priority'])} className={inputClassName}>
            {(['low', 'medium', 'high', 'critical'] as const).map((value) => <option key={value} value={value}>{copy.priorities[value]}</option>)}
          </select>
        </label>

        <label htmlFor="compliance-task-due-date" className={labelClassName}>
          {copy.dueDateLabel}
          <input id="compliance-task-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClassName} />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-200" role="alert" aria-live="assertive">{error}</p> : null}

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={isSubmitting || !title.trim()} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white outline-none transition hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50">
          {isSubmitting ? copy.creating : copy.create}
        </button>
      </div>
    </form>
  );
}
