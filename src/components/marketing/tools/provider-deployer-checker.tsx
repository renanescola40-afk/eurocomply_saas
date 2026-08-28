'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  evaluateProviderDeployerSignals,
  type RoleSignalAnswer,
  type RoleSignalAnswers,
} from '@/lib/marketing/free-tools/provider-deployer-checker';

const questions: Array<{ key: keyof RoleSignalAnswers; title: string; detail: string }> = [
  { key: 'developOrCommission', title: 'Development responsibility', detail: 'Does your organization develop the AI system, or have it developed for your organization?' },
  { key: 'ownNameOrTrademark', title: 'Own name or trademark', detail: 'Is the AI system placed on the market or put into service under your organization’s own name or trademark?' },
  { key: 'useUnderAuthority', title: 'Professional use under your authority', detail: 'Does your organization use the AI system under its authority for professional activity?' },
  { key: 'thirdPartySystem', title: 'Third-party upstream provider', detail: 'Is an external vendor or other entity supplying the AI system used by your organization?' },
];

const options: Array<{ value: RoleSignalAnswer; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Unsure' },
];

export function ProviderDeployerChecker() {
  const [answers, setAnswers] = useState<RoleSignalAnswers>({});
  const complete = questions.every((question) => answers[question.key]);
  const result = useMemo(() => evaluateProviderDeployerSignals(answers), [answers]);

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border bg-card p-6 md:p-9">
        <div className="space-y-6">
          {questions.map((question, index) => (
            <article key={question.key} className="rounded-3xl border bg-background p-5 md:p-6">
              <div className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">{index + 1}</span>
                <div>
                  <p className="font-semibold">{question.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{question.detail}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {options.map((option) => {
                  const active = answers[question.key] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setAnswers((current) => ({ ...current, [question.key]: option.value }))}
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
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Role signal map</p>
            <h2 className="mt-2 text-2xl font-bold">Answer all four questions to map provider/deployer signals.</h2>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Role signal map</p>
            <h2 className="mt-2 text-3xl font-bold">{result.title}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">{result.summary}</p>
            <ol className="mt-6 space-y-3">
              {result.nextSteps.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-2xl border bg-background p-4 text-sm leading-6">
                  <span className="font-bold">{index + 1}.</span><span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/en/signup" data-cta-id="tool-provider-deployer-signup" className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Create a role-aware inventory</Link>
              <Link href="/en/book-demo" data-cta-id="tool-provider-deployer-demo" className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold hover:bg-muted">Book a governance demo</Link>
            </div>
          </div>
        )}
        <p className="mt-6 text-xs leading-5 text-muted-foreground">Role-signal routing only. This checker does not determine your legal role, operator status, obligations or compliance and does not replace qualified legal advice.</p>
      </div>
    </section>
  );
}
