'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { denyAnalyticsConsent, grantAnalyticsConsent, initPostHog } from '@/lib/analytics/posthog-client';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const CONSENT_STORAGE_KEY = 'risckcomply.analytics.consent';

type ConsentState = 'granted' | 'denied' | 'unset';

const copy: Record<Locale, { current: string; granted: string; denied: string; unset: string; allow: string; decline: string; note: string }> = {
  en: { current: 'Current analytics choice', granted: 'Allowed', denied: 'Declined', unset: 'No choice stored', allow: 'Allow optional analytics', decline: 'Decline / withdraw analytics', note: 'Changing this choice affects optional product analytics only. Core access does not depend on analytics consent.' },
  pt: { current: 'Escolha atual de analytics', granted: 'Permitidos', denied: 'Recusados', unset: 'Nenhuma escolha guardada', allow: 'Permitir analytics opcionais', decline: 'Recusar / retirar analytics', note: 'Alterar esta escolha afeta apenas analytics opcionais do produto. O acesso principal não depende deste consentimento.' },
  es: { current: 'Elección actual de analítica', granted: 'Permitida', denied: 'Rechazada', unset: 'Sin elección guardada', allow: 'Permitir analítica opcional', decline: 'Rechazar / retirar analítica', note: 'Este cambio afecta solo a la analítica opcional. El acceso principal no depende del consentimiento.' },
  fr: { current: 'Choix analytics actuel', granted: 'Autorisé', denied: 'Refusé', unset: 'Aucun choix enregistré', allow: 'Autoriser les analytics optionnels', decline: 'Refuser / retirer les analytics', note: 'Ce choix concerne uniquement les analytics optionnels. L’accès au service principal n’en dépend pas.' },
  it: { current: 'Scelta analytics attuale', granted: 'Consentiti', denied: 'Rifiutati', unset: 'Nessuna scelta salvata', allow: 'Consenti analytics opzionali', decline: 'Rifiuta / revoca analytics', note: 'Questa scelta riguarda solo gli analytics opzionali. L’accesso principale non dipende dal consenso.' },
  de: { current: 'Aktuelle Analytics-Auswahl', granted: 'Erlaubt', denied: 'Abgelehnt', unset: 'Keine Auswahl gespeichert', allow: 'Optionale Analytics erlauben', decline: 'Analytics ablehnen / widerrufen', note: 'Diese Auswahl betrifft nur optionale Produktanalysen. Der Kerndienst hängt nicht von dieser Einwilligung ab.' },
};

export function AnalyticsConsentControls({ locale: rawLocale }: { locale: string }) {
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const labels = copy[locale];
  const [state, setState] = useState<ConsentState>('unset');

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    setState(stored === 'granted' || stored === 'denied' ? stored : 'unset');
  }, []);

  const stateLabel = state === 'granted' ? labels.granted : state === 'denied' ? labels.denied : labels.unset;

  return (
    <section className="mt-6 rounded-xl border border-blue-400/15 bg-blue-500/[0.06] p-5">
      <p className="text-sm font-semibold text-white">{labels.current}: <span className="text-blue-200">{stateLabel}</span></p>
      <p className="mt-2 text-sm leading-6 text-white/60">{labels.note}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          className="rounded-xl bg-blue-600 text-white hover:bg-blue-500"
          onClick={() => {
            grantAnalyticsConsent();
            initPostHog(window.location.pathname);
            setState('granted');
          }}
        >
          {labels.allow}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-white/15 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white"
          onClick={() => {
            denyAnalyticsConsent();
            setState('denied');
          }}
        >
          {labels.decline}
        </Button>
      </div>
    </section>
  );
}
