'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  AI_GOVERNANCE_MATURITY_DIMENSIONS,
  scoreAiGovernanceMaturity,
  type MaturityAnswer,
} from '@/lib/marketing/free-tools/ai-governance-maturity';

const options: Array<{ value: MaturityAnswer; label: string }> = [
  { value: 0, label: 'Ad hoc' },
  { value: 1, label: 'Emerging' },
  { value: 2, label: 'Managed' },
  { value: 3, label: 'Operational' },
];

export function AiGovernanceMaturityAssessment() {
  const [answers, setAnswers] = useState<Partial<Record<string, MaturityAnswer>>>({});
  const result = useMemo(() => scoreAiGovernanceMaturity(answers), [answers]);
  const complete = AI_GOVERNANCE_MATURITY_DIMENSIONS.every((dimension) => answers[dimension.id] !== undefined);

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border bg-card p-6 md:p-9">
        <div className="space-y-6">
          {AI_GOVERNANCE_MATURITY_DIMENSIONS.map((dimension, index) => (
            <article key={dimension.id} className="rounded-3xl border bg-background p-5 md:p-6">
              <div className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">{index + 1}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dimension.name}</p>
                  <h3 className="mt-1 text-lg font-semibold">{dimension.prompt}</h3>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {options.map((option) => {
                  const active = answers[dimension.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setAnswers((current) => ({ ...current, [dimension.id]: option.value }))}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${active ? 'border-foreground bg-foreground text-background' : 'hover:border-foreground/40'}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border bg-card p-7 md:p-9" aria-live="polite">
        {!complete ? (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Maturity result</p>
            <h2 className="mt-2 text-2xl font-bold">Rate all six dimensions to generate your maturity baseline.</h2>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
            <div className="rounded-3xl border bg-background p-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Maturity score</p>
              <p className="mt-3 text-6xl font-black tracking-tight">{result.score}</p>
              <p className="mt-2 text-sm font-semibold">{result.level}</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Next operating priorities</p>
              <div className="mt-4 space-y-3">
                {result.priorities.length ? result.priorities.map((priority) => (
                  <article key={priority.id} className="rounded-2xl border bg-background p-4">
                    <p className="font-semibold">{priority.name}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{priority.nextAction}</p>
                  </article>
                )) : <p className="text-sm leading-6 text-muted-foreground">Maintain the operating cadence, review evidence quality and improve controls as systems, vendors and regulatory expectations change.</p>}
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/en/signup" data-cta-id="tool-maturity-signup" className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Operationalize the workflow</Link>
                <Link href="/en/book-demo" data-cta-id="tool-maturity-demo" className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold hover:bg-muted">Book a governance demo</Link>
              </div>
            </div>
          </div>
        )}
        <p className="mt-6 text-xs leading-5 text-muted-foreground">This maturity score describes operating practices only. It is not an audit opinion, legal assessment, certification or guarantee of regulatory compliance.</p>
      </div>
    </section>
  );
}
