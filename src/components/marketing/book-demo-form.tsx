'use client';

import { useRef, useState } from 'react';

import { analyticsEvents, captureAnalyticsEvent } from '@/lib/analytics/posthog-client';
import { getMarketingAttributionProperties, persistMarketingAttribution } from '@/lib/analytics/marketing-attribution';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

type BookDemoFormProps = {
  locale: string;
};

const complianceOptions = [
  'AI system inventory and ownership',
  'AI risk assessment and review',
  'Evidence and audit trail readiness',
  'Vendor AI risk and procurement',
  'AI policies and governance workflows',
  'EU AI Act readiness and transparency duties',
];

export function BookDemoForm({ locale }: BookDemoFormProps) {
  const [state, setState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const demoStarted = useRef(false);
  const path = `/${locale}/book-demo`;

  function captureDemandEvent(event: typeof analyticsEvents.demoStarted | typeof analyticsEvents.demoSubmitted | typeof analyticsEvents.ctaClicked, extra: Record<string, string> = {}) {
    persistMarketingAttribution();
    captureAnalyticsEvent(event, {
      path,
      source: 'book-demo-page',
      funnel_stage: 'demand_capture',
      ...getMarketingAttributionProperties('last_touch'),
      ...extra,
    });
  }

  function handleDemoStarted() {
    if (demoStarted.current) return;
    demoStarted.current = true;
    captureDemandEvent(analyticsEvents.demoStarted);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('submitting');
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      fullName: String(formData.get('fullName') || ''),
      workEmail: String(formData.get('workEmail') || ''),
      companyName: String(formData.get('companyName') || ''),
      role: String(formData.get('role') || ''),
      companySize: String(formData.get('companySize') || ''),
      region: String(formData.get('region') || ''),
      complianceDrivers: formData.getAll('complianceDrivers').map(String),
      timeline: String(formData.get('timeline') || ''),
      currentProcess: String(formData.get('currentProcess') || ''),
      message: String(formData.get('message') || ''),
      consentToContact: formData.get('consentToContact') === 'on',
      source: 'book-demo-page',
      locale,
    };

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Unable to submit the form.');
      }

      captureDemandEvent(analyticsEvents.demoSubmitted);
      setState('success');
      setMessage('Demo request received. We will use your details to follow up with the next step.');
      form.reset();
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to submit the form.');
    }
  }

  return (
    <form onSubmit={handleSubmit} onFocusCapture={handleDemoStarted} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-white/80">
          Full name *
          <input name="fullName" required className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-white/35" placeholder="Jane Smith" />
        </label>
        <label className="space-y-2 text-sm font-medium text-white/80">
          Work email *
          <input name="workEmail" type="email" required className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-white/35" placeholder="jane@company.com" />
        </label>
        <label className="space-y-2 text-sm font-medium text-white/80">
          Company *
          <input name="companyName" required className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-white/35" placeholder="Acme Europe" />
        </label>
        <label className="space-y-2 text-sm font-medium text-white/80">
          Role
          <input name="role" className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-white/35" placeholder="Compliance, Legal, Security, Head of AI" />
        </label>
        <label className="space-y-2 text-sm font-medium text-white/80">
          Company size
          <select name="companySize" className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none transition focus:border-white/35">
            <option value="">Select</option>
            <option>1-10</option>
            <option>11-50</option>
            <option>51-200</option>
            <option>201-1000</option>
            <option>1000+</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-white/80">
          Region / countries
          <input name="region" className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-white/35" placeholder="Portugal, Spain, EU, UK..." />
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-white/80">What do you want to operationalize first?</legend>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {complianceOptions.map((option) => (
            <label key={option} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/65">
              <input name="complianceDrivers" type="checkbox" value={option} className="mt-1" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-white/80">
          Timeline
          <select name="timeline" className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none transition focus:border-white/35">
            <option value="">Select</option>
            <option>This month</option>
            <option>1-3 months</option>
            <option>3-6 months</option>
            <option>Exploring</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-white/80">
          Current process
          <input name="currentProcess" className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-white/35" placeholder="Spreadsheets, Notion, Drive, GRC tool..." />
        </label>
      </div>

      <label className="mt-4 block space-y-2 text-sm font-medium text-white/80">
        Message
        <textarea name="message" rows={4} className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/35" placeholder="Tell us what you need to prepare for: AI inventory, risk review, policy rollout, vendor review or evidence readiness..." />
      </label>

      <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-white/60">
        <input name="consentToContact" required type="checkbox" className="mt-1" />
        <span>I agree to be contacted about RISCK COMPLY and understand this form is for sales/demo follow-up.</span>
      </label>

      <button
        type="submit"
        data-cta-id="book-demo-submit"
        onClick={() => captureDemandEvent(analyticsEvents.ctaClicked, { cta_id: 'book-demo-submit' })}
        disabled={state === 'submitting'}
        className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-white px-7 py-4 text-base font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'submitting' ? 'Submitting...' : 'Book demo'}
      </button>

      {message ? (
        <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${state === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-red-400/30 bg-red-400/10 text-red-100'}`} aria-live="polite">
          {message}
        </p>
      ) : null}
    </form>
  );
}
