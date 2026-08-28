'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  evaluateArticle50Scenarios,
  type Article50Answer,
  type Article50ScenarioAnswers,
} from '@/lib/marketing/free-tools/article-50-checker';

const questions: Array<{ key: keyof Article50ScenarioAnswers; title: string; detail: string }> = [
  { key: 'directInteraction', title: 'Direct AI interaction', detail: 'Do natural persons interact directly with the AI system?' },
  { key: 'syntheticContent', title: 'Synthetic content', detail: 'Does the system generate or manipulate audio, image, video or text content?' },
  { key: 'emotionOrBiometric', title: 'Emotion or biometric categorisation', detail: 'Does the deployed use case involve emotion recognition or biometric categorisation?' },
  { key: 'deepfake', title: 'Deepfake content', detail: 'Does the workflow generate or manipulate content that may qualify as a deepfake?' },
  { key: 'publicInterestText', title: 'Public-interest text', detail: 'Is AI-generated or manipulated text published to inform the public on matters of public interest?' },
  { key: 'humanEditorialReview', title: 'Human editorial review', detail: 'Where public-interest text is involved, is there meaningful human review or editorial responsibility before publication?' },
];

const options: Array<{ value: Article50Answer; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Unsure' },
];

export function Article50Checker() {
  const [answers, setAnswers] = useState<Article50ScenarioAnswers>({});
  const result = useMemo(() => evaluateArticle50Scenarios(answers), [answers]);
  const complete = questions.every((question) => answers[question.key]);

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
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Review map</p>
            <h2 className="mt-2 text-2xl font-bold">Answer all six questions to generate a transparency review map.</h2>
          </div>
        ) : result.reviewAreas.length ? (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Potential review areas</p>
            <h2 className="mt-2 text-3xl font-bold">{result.reviewAreas.length} area{result.reviewAreas.length === 1 ? '' : 's'} to review or clarify</h2>
            <div className="mt-6 space-y-4">
              {result.reviewAreas.map((area) => (
                <article key={area.id} className="rounded-2xl border bg-background p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{area.title}</h3>
                    <span className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{area.signal}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{area.reason}</p>
                  <p className="mt-3 text-sm font-medium">Next: {area.nextStep}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">No positive signals from these questions</p>
            <h2 className="mt-2 text-3xl font-bold">No Article 50 review area was flagged by this limited scenario check.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">That is not a legal conclusion. Scope, exceptions, role allocation and other facts can still matter.</p>
          </div>
        )}

        {complete ? (
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/en/signup" data-cta-id="tool-article-50-signup" className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Create a governance workspace</Link>
            <Link href="/en/book-demo" data-cta-id="tool-article-50-demo" className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold hover:bg-muted">Book a readiness demo</Link>
          </div>
        ) : null}

        <p className="mt-6 text-xs leading-5 text-muted-foreground">Informational scenario mapping only. This checker does not determine legal obligations, exemptions, regulatory status or compliance and does not replace qualified legal advice.</p>
      </div>
    </section>
  );
}
