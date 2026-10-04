'use client';

import { useState } from 'react';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

type SalesContactFormProps = {
  locale: string;
  intent: string;
  plan: string;
};

const fieldClassName =
  'h-12 w-full rounded-lg border border-slate-700 bg-slate-950/35 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/60 focus-visible:ring-2 focus-visible:ring-blue-400/50';

export function SalesContactForm({ locale, intent, plan }: SalesContactFormProps) {
  const pt = locale === 'pt';
  const [state, setState] = useState<SubmitState>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('submitting');
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userMessage = String(formData.get('message') || '').trim();

    const payload = {
      fullName: String(formData.get('fullName') || ''),
      workEmail: String(formData.get('workEmail') || ''),
      companyName: String(formData.get('companyName') || ''),
      role: String(formData.get('role') || ''),
      companySize: String(formData.get('companySize') || ''),
      region: String(formData.get('region') || ''),
      message: [
        `intent=${intent}`,
        `plan=${plan}`,
        userMessage ? `message=${userMessage}` : '',
      ].filter(Boolean).join('\\n'),
      consentToContact: formData.get('consentToContact') === 'on',
      source: `contact-sales-${plan}`,
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
        throw new Error(data?.error || (pt ? 'Não foi possível enviar o pedido.' : 'Unable to send the request.'));
      }

      setState('success');
      setFeedback(
        pt
          ? 'Pedido comercial recebido. A nossa equipa poderá entrar em contacto consigo.'
          : 'Sales request received. Our team may contact you using the details provided.',
      );
      form.reset();
    } catch (error) {
      setState('error');
      setFeedback(
        error instanceof Error
          ? error.message
          : pt
            ? 'Não foi possível enviar o pedido. Tente novamente.'
            : 'Unable to send the request. Please try again.',
      );
    }
  }

  return (
    <section id="sales-contact-form" className="mx-auto mt-8 max-w-5xl scroll-mt-8">
      <div className="rounded-2xl border border-white/10 bg-[#0d1522] p-6 md:p-10">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300/70">
            {pt ? 'Contacto comercial' : 'Sales contact'}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {pt ? 'Envie o seu pedido à equipa comercial' : 'Send your request to the sales team'}
          </h2>
          <p className="mt-2 text-sm text-white/55">
            {pt ? `Plano selecionado: ${plan}` : `Selected plan: ${plan}`}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-white/80">
              {pt ? 'Nome *' : 'Name *'}
              <input name="fullName" required className={fieldClassName} autoComplete="name" />
            </label>
            <label className="space-y-2 text-sm font-medium text-white/80">
              {pt ? 'Email profissional *' : 'Work email *'}
              <input name="workEmail" type="email" required className={fieldClassName} autoComplete="email" />
            </label>
            <label className="space-y-2 text-sm font-medium text-white/80">
              {pt ? 'Empresa *' : 'Company *'}
              <input name="companyName" required className={fieldClassName} autoComplete="organization" />
            </label>
            <label className="space-y-2 text-sm font-medium text-white/80">
              {pt ? 'Função' : 'Role'}
              <input name="role" className={fieldClassName} />
            </label>
            <label className="space-y-2 text-sm font-medium text-white/80">
              {pt ? 'Dimensão da empresa' : 'Company size'}
              <select name="companySize" className={fieldClassName}>
                <option value="">{pt ? 'Selecionar' : 'Select'}</option>
                <option>1-10</option>
                <option>11-50</option>
                <option>51-200</option>
                <option>201-1000</option>
                <option>1000+</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-white/80">
              {pt ? 'País / região' : 'Country / region'}
              <input name="region" className={fieldClassName} autoComplete="country-name" />
            </label>
          </div>

          <label className="mt-4 block space-y-2 text-sm font-medium text-white/80">
            {pt ? 'Mensagem / contexto' : 'Message / context'}
            <textarea name="message" rows={4} className={`${fieldClassName} h-auto py-3`} />
          </label>

          <label className="mt-5 flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/20 p-3 text-sm leading-6 text-white/60">
            <input name="consentToContact" required type="checkbox" className="mt-1 accent-blue-600" />
            <span>
              {pt
                ? 'Autorizo a RISCK COMPLY a contactar-me sobre este pedido comercial.'
                : 'I agree to be contacted by RISCK COMPLY about this sales request.'}
            </span>
          </label>

          <button
            type="submit"
            disabled={state === 'submitting'}
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-7 py-4 text-base font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === 'submitting'
              ? pt ? 'A enviar...' : 'Sending...'
              : pt ? 'Enviar pedido comercial' : 'Send sales request'}
          </button>

          {feedback ? (
            <p
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                state === 'success'
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                  : 'border-red-400/30 bg-red-400/10 text-red-100'
              }`}
              aria-live="polite"
              role="status"
            >
              {feedback}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
