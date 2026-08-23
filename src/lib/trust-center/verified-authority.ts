import { type Locale } from '@/lib/i18n/routing';
import { type TrustPage } from './content';

export const VERIFIED_SECURITY_EMAIL = 'comercial@risckcomply.com';
export const VERIFIED_STATUS_PAGE_URL = 'https://risckcomplystatus1.statuspage.io/';
export const VERIFIED_AUTHORITY_REVIEWED_AT = '2026-08-23';

const vulnerabilityContact: Record<Locale, string> = {
  en: `Send security reports privately to ${VERIFIED_SECURITY_EMAIL}. Until a dedicated security alias is re-verified, this reachable corporate mailbox is the canonical private security intake path.`,
  pt: `Envie relatórios de segurança em privado para ${VERIFIED_SECURITY_EMAIL}. Até um alias dedicado de segurança voltar a ser verificado, esta caixa corporativa acessível é o canal canónico de receção privada de segurança.`,
  es: `Envíe los informes de seguridad de forma privada a ${VERIFIED_SECURITY_EMAIL}. Hasta que se vuelva a verificar un alias de seguridad dedicado, este buzón corporativo accesible es el canal canónico de recepción privada de seguridad.`,
  fr: `Envoyez les signalements de sécurité en privé à ${VERIFIED_SECURITY_EMAIL}. Jusqu’à la nouvelle vérification d’un alias de sécurité dédié, cette boîte d’entreprise joignable est le canal privé de sécurité de référence.`,
  it: `Inviare privatamente le segnalazioni di sicurezza a ${VERIFIED_SECURITY_EMAIL}. Finché non sarà nuovamente verificato un alias di sicurezza dedicato, questa casella aziendale raggiungibile è il canale privato di sicurezza canonico.`,
  de: `Sicherheitsmeldungen sind vertraulich an ${VERIFIED_SECURITY_EMAIL} zu senden. Bis ein dedizierter Sicherheitsalias erneut verifiziert ist, ist dieses erreichbare Unternehmenspostfach der maßgebliche private Sicherheitskanal.`,
};

const securityIncidentContact: Record<Locale, string> = {
  en: `Private security reports use ${VERIFIED_SECURITY_EMAIL}; public incident communication uses ${VERIFIED_STATUS_PAGE_URL}. The dedicated security alias is not claimed as active until external delivery is re-verified.`,
  pt: `Os relatórios privados de segurança usam ${VERIFIED_SECURITY_EMAIL}; a comunicação pública de incidentes usa ${VERIFIED_STATUS_PAGE_URL}. Um alias dedicado de segurança não é apresentado como ativo até a entrega externa voltar a ser verificada.`,
  es: `Los informes privados de seguridad usan ${VERIFIED_SECURITY_EMAIL}; la comunicación pública de incidentes usa ${VERIFIED_STATUS_PAGE_URL}. No se presenta un alias de seguridad dedicado como activo hasta volver a verificar la entrega externa.`,
  fr: `Les signalements privés de sécurité utilisent ${VERIFIED_SECURITY_EMAIL}; la communication publique des incidents utilise ${VERIFIED_STATUS_PAGE_URL}. Aucun alias de sécurité dédié n’est présenté comme actif avant une nouvelle vérification de sa délivrabilité externe.`,
  it: `Le segnalazioni private di sicurezza usano ${VERIFIED_SECURITY_EMAIL}; la comunicazione pubblica degli incidenti usa ${VERIFIED_STATUS_PAGE_URL}. Un alias di sicurezza dedicato non viene dichiarato attivo finché la consegna esterna non viene nuovamente verificata.`,
  de: `Private Sicherheitsmeldungen nutzen ${VERIFIED_SECURITY_EMAIL}; öffentliche Vorfallkommunikation nutzt ${VERIFIED_STATUS_PAGE_URL}. Ein dedizierter Sicherheitsalias wird erst nach erneuter externer Zustellbarkeitsprüfung als aktiv ausgewiesen.`,
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

  if (page.slug === 'security') {
    return {
      ...page,
      updated: VERIFIED_AUTHORITY_REVIEWED_AT,
      sections: page.sections.map((section, index) =>
        index === page.sections.length - 1 ? { ...section, body: securityIncidentContact[locale] } : section,
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
