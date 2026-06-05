'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type CreateRiskFormInput = {
  title: string;
  description?: string;
  category?: string;
  likelihood: number;
  impact: number;
  mitigation?: string;
  dueDate?: string;
};

type Props = {
  onSubmit: (input: CreateRiskFormInput) => Promise<void> | void;
};

export function CreateRiskForm({ onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [mitigation, setMitigation] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        title,
        description: description || undefined,
        category: category || undefined,
        likelihood,
        impact,
        mitigation: mitigation || undefined,
        dueDate: dueDate || undefined,
      });
      setTitle('');
      setDescription('');
      setCategory('');
      setLikelihood(3);
      setImpact(3);
      setMitigation('');
      setDueDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create risk.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add risk</CardTitle>
        <CardDescription>Track a compliance, vendor or operational risk.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full rounded-md border px-3 py-2" placeholder="Risk title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <textarea className="w-full rounded-md border px-3 py-2" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <input className="w-full rounded-md border px-3 py-2" placeholder="Category" value={category} onChange={(event) => setCategory(event.target.value)} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">Likelihood
              <input className="w-full rounded-md border px-3 py-2" type="number" min={1} max={5} value={likelihood} onChange={(event) => setLikelihood(Number(event.target.value))} />
            </label>
            <label className="space-y-1 text-sm">Impact
              <input className="w-full rounded-md border px-3 py-2" type="number" min={1} max={5} value={impact} onChange={(event) => setImpact(Number(event.target.value))} />
            </label>
          </div>
          <textarea className="w-full rounded-md border px-3 py-2" placeholder="Mitigation plan" value={mitigation} onChange={(event) => setMitigation(event.target.value)} />
          <input className="w-full rounded-md border px-3 py-2" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading || !title}>{loading ? 'Creating...' : 'Create risk'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
