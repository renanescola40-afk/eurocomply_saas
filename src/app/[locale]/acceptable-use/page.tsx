import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const LAST_UPDATED = '21 August 2026';

const copy: Record<Locale, { eyebrow: string; title: string; summary: string; sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }> }> = {
  en: {
    eyebrow: 'Acceptable Use Policy',
    title: 'Acceptable and prohibited use of RISCK COMPLY',
    summary: 'This review draft defines the minimum technical and abuse-prevention rules for use of the service while final contractual wording remains subject to qualified legal approval.',
    sections: [
      { title: 'Security and access', items: ['Do not access or attempt to access another tenant, account or resource without authorization.', 'Do not bypass authentication, authorization, rate limits or other security controls.', 'Do not probe, scan or test the service without written authorization and an agreed rules-of-engagement scope.', 'Do not use stolen, shared or improperly obtained credentials.'] },
      { title: 'Malware, interference and abuse', items: ['Do not introduce malware, destructive payloads or content intended to compromise the service or another user.', 'Do not deliberately degrade availability, overload infrastructure or interfere with service operation.', 'Do not scrape or automate access in a way that violates agreed limits, security controls or applicable law.'] },
      { title: 'Unlawful and prohibited AI use', items: ['Do not use the service to facilitate unlawful surveillance, discrimination, fraud, harassment or other unlawful activity.', 'Do not use generated compliance material as a false certification, regulator approval, conformity assessment or legal opinion.', 'Do not submit data or instructions that the customer is not authorized to process.'] },
      { title: 'Enforcement', paragraphs: ['RISCK COMPLY may restrict or suspend activity when reasonably necessary to contain a security incident, unlawful use or material abuse. Final notice, cure, restoration and termination rules remain subject to the approved Terms and qualified legal review.'] },
    ],
  },
  pt: {
    eyebrow: 'Política de Utilização Aceitável',
    title: 'Utilização aceitável e proibida da RISCK COMPLY',
    summary: 'Este rascunho define regras técnicas mínimas de segurança e prevenção de abuso enquanto a redação contratual final permanece sujeita a aprovação jurídica qualificada.',
    sections: [
      { title: 'Segurança e acesso', items: ['Não aceder nem tentar aceder a outro tenant, conta ou recurso sem autorização.', 'Não contornar autenticação, autorização, rate limits ou outros controlos de segurança.', 'Não testar, fazer scan ou pentest sem autorização escrita e regras de engagement acordadas.', 'Não utilizar credenciais roubadas, partilhadas indevidamente ou obtidas de forma não autorizada.'] },
      { title: 'Malware, interferência e abuso', items: ['Não introduzir malware, payloads destrutivos ou conteúdo destinado a comprometer o serviço ou outro utilizador.', 'Não degradar deliberadamente a disponibilidade, sobrecarregar infraestrutura ou interferir com a operação.', 'Não fazer scraping ou automação que viole limites acordados, controlos de segurança ou a lei aplicável.'] },
      { title: 'Utilização ilegal e práticas de IA proibidas', items: ['Não usar o serviço para facilitar vigilância ilegal, discriminação, fraude, assédio ou outra atividade ilegal.', 'Não apresentar material gerado como certificação, aprovação regulatória, avaliação de conformidade ou opinião jurídica.', 'Não submeter dados ou instruções que o cliente não esteja autorizado a tratar.'] },
      { title: 'Aplicação das regras', paragraphs: ['A RISCK COMPLY pode restringir ou suspender atividade quando razoavelmente necessário para conter incidente de segurança, utilização ilegal ou abuso material. Regras finais de aviso, cura, reposição e cessação dependem dos Terms aprovados e de revisão jurídica qualificada.'] },
    ],
  },
  es: {
    eyebrow: 'Política de Uso Aceptable', title: 'Uso aceptable y prohibido de RISCK COMPLY', summary: 'Borrador técnico de reglas mínimas de seguridad y prevención de abuso.', sections: [
      { title: 'Seguridad y acceso', items: ['No acceder a otro tenant o recurso sin autorización.', 'No eludir controles de autenticación, autorización o límites.', 'No realizar pruebas de seguridad sin autorización escrita.'] },
      { title: 'Abuso', items: ['No introducir malware ni interferir deliberadamente con la disponibilidad.', 'No usar credenciales obtenidas de forma indebida.'] },
      { title: 'Uso ilícito', items: ['No facilitar actividades ilícitas ni presentar salidas del producto como certificación o asesoramiento jurídico.'] },
    ],
  },
  fr: {
    eyebrow: 'Politique d’utilisation acceptable', title: 'Utilisation acceptable et interdite de RISCK COMPLY', summary: 'Projet technique de règles minimales de sécurité et de prévention des abus.', sections: [
      { title: 'Sécurité et accès', items: ['Ne pas accéder à un autre tenant ou à une autre ressource sans autorisation.', 'Ne pas contourner les contrôles d’authentification, d’autorisation ou de limitation.', 'Ne pas effectuer de test de sécurité sans autorisation écrite.'] },
      { title: 'Abus', items: ['Ne pas introduire de logiciel malveillant ni perturber volontairement la disponibilité.', 'Ne pas utiliser d’identifiants obtenus de manière abusive.'] },
      { title: 'Usage illicite', items: ['Ne pas faciliter une activité illicite ni présenter les résultats comme une certification ou un avis juridique.'] },
    ],
  },
  it: {
    eyebrow: 'Politica di Uso Accettabile', title: 'Uso accettabile e vietato di RISCK COMPLY', summary: 'Bozza tecnica delle regole minime di sicurezza e prevenzione degli abusi.', sections: [
      { title: 'Sicurezza e accesso', items: ['Non accedere a tenant o risorse altrui senza autorizzazione.', 'Non aggirare autenticazione, autorizzazione o limiti.', 'Non eseguire test di sicurezza senza autorizzazione scritta.'] },
      { title: 'Abuso', items: ['Non introdurre malware né interferire intenzionalmente con la disponibilità.', 'Non usare credenziali ottenute impropriamente.'] },
      { title: 'Uso illecito', items: ['Non facilitare attività illecite né presentare gli output come certificazione o parere legale.'] },
    ],
  },
  de: {
    eyebrow: 'Acceptable-Use-Richtlinie', title: 'Zulässige und unzulässige Nutzung von RISCK COMPLY', summary: 'Technischer Entwurf mit Mindestregeln für Sicherheit und Missbrauchsprävention.', sections: [
      { title: 'Sicherheit und Zugriff', items: ['Kein Zugriff auf fremde Mandanten oder Ressourcen ohne Autorisierung.', 'Authentifizierungs-, Autorisierungs- oder Rate-Limit-Kontrollen dürfen nicht umgangen werden.', 'Sicherheitstests dürfen nur mit schriftlicher Genehmigung erfolgen.'] },
      { title: 'Missbrauch', items: ['Keine Malware einbringen oder die Verfügbarkeit absichtlich beeinträchtigen.', 'Keine unrechtmäßig erlangten Zugangsdaten verwenden.'] },
      { title: 'Rechtswidrige Nutzung', items: ['Keine rechtswidrigen Aktivitäten unterstützen und Ausgaben nicht als Zertifizierung oder Rechtsgutachten darstellen.'] },
    ],
  },
};

export default async function AcceptableUsePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const page = copy[locale];

  return <PublicLegalReviewPage locale={locale} eyebrow={page.eyebrow} title={page.title} summary={page.summary} documentId="acceptable-use" version="0.1-review" lastUpdated={LAST_UPDATED} sections={page.sections} />;
}
