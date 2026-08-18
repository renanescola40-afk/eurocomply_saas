import { type Locale } from '@/lib/i18n/routing';
import { type TrustPage } from './content';

export const VERIFIED_SECURITY_EMAIL = 'security@risckcomply.com';
export const VERIFIED_STATUS_PAGE_URL = 'https://risckcomplystatus1.statuspage.io/';
export const VERIFIED_AUTHORITY_REVIEWED_AT = '2026-08-18';

const vulnerabilityContact: Record<Locale, string> = {
  en: `Send security reports privately to ${VERIFIED_SECURITY_EMAIL}. This dedicated corporate security channel has verified external delivery and is monitored by an authorized RISCK COMPLY owner.`,
  pt: `Envie relatórios de segurança em privado para ${VERIFIED_SECURITY_EMAIL}. Este canal corporativo dedicado tem entrega externa verificada e é monitorizado por um responsável autorizado da RISCK COMPLY.`,
  es: `Envíe los informes de seguridad de forma privada a ${VERIFIED_SECURITY_EMAIL}. Este canal corporativo dedicado tiene entrega externa verificada y está supervisado por un responsable autorizado de RISCK COMPLY.`,
  fr: `Envoyez les signalements de sécurité en privé à ${VERIFIED_SECURITY_EMAIL}. Ce canal de sécurité d’entreprise dédié dispose d’une livraison externe vérifiée et est surveillé par un responsable RISCK COMPLY autorisé.`,
  it: `Inviare privatamente le segnalazioni di sicurezza a ${VERIFIED_SECURITY_EMAIL}. Questo canale aziendale dedicato ha la consegna esterna verificata ed è monitorato da un responsabile RISCK COMPLY autorizzato.`,
  de: `Sicherheitsmeldungen sind vertraulich an ${VERIFIED_SECURITY_EMAIL} zu senden. Dieser dedizierte Unternehmenskanal verfügt über verifizierte externe Zustellung und wird von einem autorisierten RISCK-COMPLY-Verantwortlichen überwacht.`,
};

const statusAuthority: Record<Locale, string> = {
  en: `The authoritative public incident-communication service is ${VERIFIED_STATUS_PAGE_URL}. Service components and controlled incident updates are published there by authorized operators.`,
  pt: `A autoridade pública para comunicação de incidentes é ${VERIFIED_STATUS_PAGE_URL}. Os componentes do serviço e as atualizações de incidentes são publicados nesse serviço por operadores autorizados.`,
  es: `La autoridad pública para la comunicación de incidentes es ${VERIFIED_STATUS_PAGE_URL}. Los componentes del servicio y las actualizaciones de incidentes se publican allí por operadores autorizados.`,
  fr: `L’autorité publique de communication des incidents est ${VERIFIED_STATUS_PAGE_URL}. Les composants du service et les mises à jour d’incidents y sont publiés par des opérateurs autorisés.`,
  it: `L’autorità pubblica per la comunicazione degli incidenti è ${VERIFIED_STATUS_PAGE_URL}. I componenti del servizio e gli aggiornamenti sugli incidenti sono pubblicati lì da operatori autorizzati.`,
  de: `Die maßgebliche öffentliche Stelle für Vorfallkommunikation ist ${VERIFIED_STATUS_PAGE_URL}. Dienstkomponenten und Vorfallupdates werden dort von autorisierten Betreibern veröffentlicht.`,
};

export function applyVerifiedTrustAuthority(page: TrustPage, locale: Locale): TrustPage {
  if (page.slug === 'vulnerability-disclosure') {
    return {
      ...page,
      updated: VERIFIED_AUTHORITY_REVIEWED_AT,
      sections: page.sections.map((section, index) =>
        index === 0 ? { ...section, body: vulnerabilityContact[locale] } : section,
      ),
    };
  }

  if (page.slug === 'status') {
    return {
      ...page,
      updated: VERIFIED_AUTHORITY_REVIEWED_AT,
      status: statusAuthority[locale],
      sections: page.sections.map((section, index) =>
        index === 0 ? { ...section, body: statusAuthority[locale] } : section,
      ),
    };
  }

  return page;
}
