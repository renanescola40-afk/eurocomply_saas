'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  AI_ACT_READINESS_QUESTIONS,
  buildReadinessShareText,
  scoreAiActReadiness,
  type ReadinessAnswer,
} from '@/lib/marketing/free-tools/ai-act-readiness';

const answerOptions: Array<{ value: ReadinessAnswer; label: string; helper: string }> = [
  { value: 0, label: 'Not yet', helper: 'No repeatable control or evidence yet' },
  { value: 1, label: 'Partly', helper: 'Some practice exists, but it is incomplete or inconsistent' },
  { value: 2, label: 'In place', helper: 'A repeatable control exists with accountable ownership or evidence' },
];

export function AiActReadinessAssessment() {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Partial<Record<string, ReadinessAnswer>>>({});
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => scoreAiActReadiness(answers), [answers]);
  const complete = result.answered === result.total;

  async function copySummary() {
    if (!complete || !navigator.clipboard) return;
    await navigator.clipboard.writeText(buildReadinessShareText(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!started) {
    return (
      <section className="rounded-[2rem] border bg-card p-7 shadow-sm md:p-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free readiness tool</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Check your operational AI governance baseline</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Answer eight operational questions across inventory, ownership, role mapping, risk review, transparency, oversight, vendor governance and evidence. Your answers stay in this browser session and are not submitted to RISCK COMPLY.
          </p>
          <button
            type="button"
            data-cta-id="tool-ai-act-readiness-start"
            onClick={() => setStarted(true)}
            className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Start the assessment
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border bg-card p-6 md:p-9">
        <div className="flex flex-col gap-3 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">AI governance readiness</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{result.answered} of {result.total} answered</h2>
          </div>
          <p className="text-sm text-muted-foreground">0 = not yet · 1 = partly · 2 = in place</p>
        </div>

        <div className="mt-8 space-y-8">
          {AI_ACT_READINESS_QUESTIONS.map((question, index) => (
            <article key={question.id} className="rounded-3xl border bg-background p-5 md:p-6">
              <div className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">{index + 1}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{question.dimension}</p>
                  <h3 className="mt-1 text-lg font-semibold">{question.prompt}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.guidance}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {answerOptions.map((option) => {
                  const active = answers[question.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))}
                      className={`rounded-2xl border p-4 text-left transition ${active ? 'border-foreground bg-foreground text-background' : 'bg-card hover:border-foreground/40'}`}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className={`mt-1 block text-xs leading-5 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>{option.helper}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border bg-card p-7 md:p-10" aria-live="polite">
        {!complete ? (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Result</p>
            <h2 className="mt-2 text-2xl font-bold">Complete all eight questions to generate your score.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">The score is an operational readiness indicator, not a legal compliance determination or AI Act classification.</p>
          </div>
        ) : (
          <div data-cta-id="tool-ai-act-readiness-result">
            <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:items-start">
              <div className="rounded-3xl border bg-background p-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Readiness score</p>
                <p className="mt-3 text-6xl font-black tracking-tight">{result.score}</p>
                <p className="mt-2 text-sm font-semibold">{result.level}</p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Priority actions</p>
                {result.priorities.length ? (
                  <ol className="mt-4 space-y-4">
                    {result.priorities.map((priority) => (
                      <li key={priority.id} className="rounded-2xl border bg-background p-4">
                        <p className="font-semibold">{priority.dimension}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{priority.action}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">Your answers show a stronger baseline. Keep controls current, retain evidence and review whether legal or regulatory changes require updates.</p>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                data-cta-id="tool-ai-act-readiness-copy"
                onClick={copySummary}
                className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold hover:bg-muted"
              >
                {copied ? 'Copied' : 'Copy privacy-safe summary'}
              </button>
              <Link
                href="/en/signup"
                data-cta-id="tool-ai-act-readiness-signup"
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Create your governance workspace
              </Link>
              <Link
                href="/en/book-demo"
                data-cta-id="tool-ai-act-readiness-demo"
                className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold hover:bg-muted"
              >
                Book a readiness demo
              </Link>
            </div>

            <p className="mt-6 text-xs leading-5 text-muted-foreground">
              Indicative operational readiness only. This assessment does not determine legal status, AI Act classification, regulatory compliance or replace qualified legal advice.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
