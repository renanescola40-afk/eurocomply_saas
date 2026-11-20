type CommercialContactMailtoFallbackProps = {
  intent: 'demo' | 'sales';
};

const SALES_EMAIL = 'comercial@risckcomply.com';

// This is a server-rendered, no-form commercial path while the public
// Privacy notice remains a review draft. It never collects lead data itself.
export function CommercialContactMailtoFallback({ intent }: CommercialContactMailtoFallbackProps) {
  const isDemo = intent === 'demo';
  const subject = isDemo ? 'RISCK COMPLY demo request' : 'RISCK COMPLY commercial enquiry';
  const mailto = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}`;

  return (
    <section
      id="sales-contact-form"
      aria-labelledby="assisted-contact-title"
      className="mx-auto w-full scroll-mt-8 rounded-xl border border-blue-400/25 bg-[#0d1522] p-6 md:p-8"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
        Assisted commercial contact
      </p>
      <h2 id="assisted-contact-title" className="mt-4 text-2xl font-semibold text-white">
        {isDemo ? 'Request a guided demonstration by email' : 'Contact the commercial team directly'}
      </h2>
      <p className="mt-4 text-sm leading-7 text-slate-300">
        Online forms are unavailable while the public Privacy Policy is under review.
        You can use your own email application to contact our team without entering
        personal information into an inactive website form.
      </p>
      <a
        href={mailto}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        Email {SALES_EMAIL}
      </a>
      <p className="mt-4 text-xs leading-6 text-slate-400">
        Please avoid sending confidential records or sensitive documents in the first message.
        Sending an email does not confirm a meeting, activate an account or create a subscription.
      </p>
    </section>
  );
}
