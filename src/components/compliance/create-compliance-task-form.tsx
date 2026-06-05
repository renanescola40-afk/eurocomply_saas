'use client';

import { useState } from 'react';

export type CreateComplianceTaskFormInput = {
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
};

type Props = {
  onSubmit: (input: CreateComplianceTaskFormInput) => Promise<void> | void;
};

export function CreateComplianceTaskForm({ onSubmit }: Props) {
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
      setError(err instanceof Error ? err.message : 'Could not create task.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Add compliance requirement</h2>
        <p className="mt-1 text-sm text-white/55">Create a trackable task for your compliance program.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2 text-sm text-white/70">
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none" placeholder="Review privacy policy" />
        </label>

        <label className="md:col-span-2 text-sm text-white/70">
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none" placeholder="What needs to be done?" />
        </label>

        <label className="text-sm text-white/70">
          Category
          <input value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none" />
        </label>

        <label className="text-sm text-white/70">
          Priority
          <select value={priority} onChange={(event) => setPriority(event.target.value as CreateComplianceTaskFormInput['priority'])} className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>

        <label className="text-sm text-white/70">
          Due date
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none" />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <button type="submit" disabled={isSubmitting || !title.trim()} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50">
        {isSubmitting ? 'Creating...' : 'Create task'}
      </button>
    </form>
  );
}
