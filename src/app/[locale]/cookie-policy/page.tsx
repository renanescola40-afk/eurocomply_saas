import { PublicLegalReviewPage } from '@/components/legal/public-legal-review-page';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const LAST_UPDATED = '21 August 2026';

const copy: Record<Locale, { eyebrow: string; title: string; summary: string; sections: Array<{ title: string; paragraphs?: string[]; items?: string[] }> }> = {
  en: {
    eyebrow: 'Cookie Policy',
    title: 'Cookies, local storage and analytics consent',
    summary: 'This review draft describes the browser storage used to operate RISCK COMPLY and the technical boundary for optional product analytics.',
    sections: [
      { title: 'Strictly necessary storage', items: ['NEXT_LOCALE stores the selected interface locale.', 'Authentication providers may use session storage or cookies required to keep a user signed in and protect authenticated routes.', 'Security and checkout flows may use provider-managed storage that is necessary to complete the requested operation.'] },
      { title: 'Optional analytics', paragraphs: ['RISCK COMPLY integrates PostHog for optional product analytics where configured. The browser client is designed not to initialise PostHog when consent-required mode is enabled until the user has explicitly granted analytics consent.'], items: ['Analytics consent choice is stored in localStorage under risckcomply.analytics.consent.', 'Autocapture is disabled by the application integration.', 'Session recording is disabled by default and sensitive application paths are excluded from recording logic.', 'The exact production consent flag must be verified against the active deployment before this draft is approved as final.'] },
      { title: 'Choice and withdrawal', paragraphs: ['Users should be able to decline optional analytics without losing access to the core service. A consent choice must not be treated as permission for unrelated processing.'], items: ['Declining calls the analytics opt-out path.', 'Granting consent permits the analytics client to initialise.', 'Changing or withdrawing a previous choice must remain available through the cookie settings control.'] },
      { title: 'Provider and retention verification', paragraphs: ['Cookie names, storage duration, analytics region, provider retention and transfer treatment must be reconciled with the live production configuration and qualified legal review before final publication.'] },
    ],
  },
  pt: {
    eyebrow: 'Política de Cookies',
    title: 'Cookies, armazenamento local e consentimento de analytics',
    summary: 'Este rascunho descreve o armazenamento no navegador usado para operar a RISCK COMPLY e o limite técnico para analytics opcionais do produto.',
    sections: [
      { title: 'Armazenamento estritamente necessário', items: ['NEXT_LOCALE guarda o idioma selecionado da interface.', 'Os fornecedores de autenticação podem usar cookies ou armazenamento de sessão necessários para manter o utilizador autenticado e proteger rotas privadas.', 'Fluxos de segurança e checkout podem usar armazenamento gerido pelo fornecedor quando necessário para concluir a operação pedida.'] },
      { title: 'Analytics opcionais', paragraphs: ['A RISCK COMPLY integra PostHog para analytics opcionais quando configurado. O cliente no navegador foi desenhado para não inicializar o PostHog, quando o modo de consentimento obrigatório está ativo, até existir consentimento explícito.'], items: ['A escolha é guardada em localStorage na chave risckcomply.analytics.consent.', 'O autocapture está desativado pela integração da aplicação.', 'A gravação de sessão está desativada por defeito e caminhos sensíveis são excluídos pela lógica da aplicação.', 'A flag exata de consentimento em produção deve ser verificada no deployment ativo antes de este rascunho poder ser aprovado como final.'] },
      { title: 'Escolha e retirada', paragraphs: ['O utilizador deve poder recusar analytics opcionais sem perder acesso ao serviço principal. O consentimento não deve ser reutilizado para finalidades não relacionadas.'], items: ['Recusar executa o caminho de opt-out de analytics.', 'Aceitar permite inicializar o cliente de analytics.', 'Alterar ou retirar uma escolha anterior deve continuar disponível através do controlo de definições de cookies.'] },
      { title: 'Verificação de fornecedor e conservação', paragraphs: ['Nomes de cookies, duração, região de analytics, conservação do fornecedor e tratamento de transferências devem ser reconciliados com a configuração LIVE e revisão jurídica qualificada antes da publicação final.'] },
    ],
  },
  es: {
    eyebrow: 'Política de Cookies', title: 'Cookies, almacenamiento local y consentimiento de analítica', summary: 'Borrador técnico sobre almacenamiento del navegador y analítica opcional.', sections: [
      { title: 'Almacenamiento necesario', items: ['NEXT_LOCALE conserva el idioma seleccionado.', 'La autenticación puede usar cookies o almacenamiento de sesión necesarios para mantener una sesión segura.'] },
      { title: 'Analítica opcional', paragraphs: ['La integración de PostHog está diseñada para no iniciarse antes del consentimiento cuando el modo de consentimiento obligatorio está activo. La configuración exacta de producción debe verificarse antes de aprobación final.'] },
      { title: 'Elección y retirada', paragraphs: ['Rechazar la analítica opcional no debe impedir el uso del servicio principal y la elección debe poder modificarse posteriormente.'] },
    ],
  },
  fr: {
    eyebrow: 'Politique relative aux cookies', title: 'Cookies, stockage local et consentement analytics', summary: 'Projet technique décrivant le stockage navigateur et les analytics optionnels.', sections: [
      { title: 'Stockage nécessaire', items: ['NEXT_LOCALE conserve la langue sélectionnée.', 'L’authentification peut utiliser des cookies ou du stockage de session nécessaires à une session sécurisée.'] },
      { title: 'Analytics optionnels', paragraphs: ['L’intégration PostHog est conçue pour ne pas démarrer avant consentement lorsque le mode de consentement obligatoire est actif. La configuration de production doit être vérifiée avant validation finale.'] },
      { title: 'Choix et retrait', paragraphs: ['Le refus des analytics optionnels ne doit pas empêcher l’utilisation du service principal et le choix doit pouvoir être modifié ultérieurement.'] },
    ],
  },
  it: {
    eyebrow: 'Cookie Policy', title: 'Cookie, archiviazione locale e consenso analytics', summary: 'Bozza tecnica sullo storage del browser e sugli analytics opzionali.', sections: [
      { title: 'Archiviazione necessaria', items: ['NEXT_LOCALE conserva la lingua selezionata.', 'L’autenticazione può usare cookie o storage di sessione necessari a mantenere una sessione sicura.'] },
      { title: 'Analytics opzionali', paragraphs: ['L’integrazione PostHog è progettata per non inizializzarsi prima del consenso quando la modalità di consenso obbligatorio è attiva. La configurazione di produzione deve essere verificata prima dell’approvazione finale.'] },
      { title: 'Scelta e revoca', paragraphs: ['Il rifiuto degli analytics opzionali non deve impedire l’uso del servizio principale e la scelta deve poter essere modificata in seguito.'] },
    ],
  },
  de: {
    eyebrow: 'Cookie-Richtlinie', title: 'Cookies, lokaler Speicher und Analytics-Einwilligung', summary: 'Technischer Entwurf zu Browserspeicher und optionalen Produktanalysen.', sections: [
      { title: 'Erforderlicher Speicher', items: ['NEXT_LOCALE speichert die ausgewählte Sprache.', 'Die Authentifizierung kann erforderliche Cookies oder Sitzungsspeicher für eine sichere Anmeldung verwenden.'] },
      { title: 'Optionale Analytics', paragraphs: ['Die PostHog-Integration ist so ausgelegt, dass sie im einwilligungspflichtigen Modus nicht vor einer ausdrücklichen Einwilligung startet. Die Produktionskonfiguration muss vor der finalen Freigabe geprüft werden.'] },
      { title: 'Auswahl und Widerruf', paragraphs: ['Die Ablehnung optionaler Analytics darf den Kerndienst nicht blockieren und die Auswahl muss später geändert werden können.'] },
    ],
  },
};

export default async function CookiePolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const page = copy[locale];

  return <PublicLegalReviewPage locale={locale} eyebrow={page.eyebrow} title={page.title} summary={page.summary} documentId="cookie-policy" version="0.1-review" lastUpdated={LAST_UPDATED} sections={page.sections} />;
}
