import { resolveRecipientLocale } from '@/lib/i18n/recipient-locale';
import type { Locale } from '@/lib/i18n/routing';

export type EmailTemplateKey =
  | 'welcome_onboarding'
  | 'organization_created'
  | 'member_invited'
  | 'billing_started'
  | 'invoice_failed'
  | 'compliance_deadline_reminder'
  | 'qualified-review-reminder'
  | 'export_ready'
  | 'security_alert'
  | 'trial_upgrade'
  | 'document_expiring'
  | 'vendor_review';

type BuiltEmail = {
  template: EmailTemplateKey;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string | null;
};

type BaseTemplateInput = { organizationName: string; locale?: Locale | string | null };
type WelcomeOnboardingEmailInput = BaseTemplateInput & { dashboardUrl: string };
type OrganizationCreatedEmailInput = BaseTemplateInput & { organizationUrl: string; createdByName?: string | null };
type MemberInvitedEmailInput = BaseTemplateInput & { role: string; inviteUrl: string; invitedByName?: string | null };
type BillingStartedEmailInput = BaseTemplateInput & { planName: string; billingUrl: string };
type InvoiceFailedEmailInput = BaseTemplateInput & { billingUrl: string; amountDue?: string | null; dueDate?: string | null };
type ComplianceDeadlineReminderEmailInput = BaseTemplateInput & { deadlineName: string; dueDate: string; dashboardUrl: string; unsubscribeUrl?: string | null };
type ExportReadyEmailInput = BaseTemplateInput & { exportName: string; exportsUrl: string };
type SecurityAlertEmailInput = BaseTemplateInput & { alertTitle: string; occurredAt: string; securityUrl: string; ipAddress?: string | null; location?: string | null };
type TrialUpgradeEmailInput = BaseTemplateInput & { billingUrl: string; daysRemaining?: number };
type DocumentExpiringEmailInput = BaseTemplateInput & { documentName: string; expiresAt: string; documentsUrl: string };
type VendorReviewEmailInput = BaseTemplateInput & { vendorName: string; vendorsUrl: string; reviewDueAt?: string | null };

const PRODUCT_NAME = 'Risck Comply';

type LocalizedText = Record<Locale, string>;

const TAGLINE: LocalizedText = {
  en: 'AI compliance operations for growing teams',
  pt: 'Operações de compliance de IA para equipas em crescimento',
  es: 'Operaciones de compliance de IA para equipos en crecimiento',
  fr: 'Opérations de conformité IA pour les équipes en croissance',
  it: 'Operazioni di compliance IA per team in crescita',
  de: 'KI-Compliance-Abläufe für wachsende Teams',
};

const DEFAULT_FOOTER: LocalizedText = {
  en: `Message sent by ${PRODUCT_NAME}.`,
  pt: `Mensagem enviada pela ${PRODUCT_NAME}.`,
  es: `Mensaje enviado por ${PRODUCT_NAME}.`,
  fr: `Message envoyé par ${PRODUCT_NAME}.`,
  it: `Messaggio inviato da ${PRODUCT_NAME}.`,
  de: `Nachricht gesendet von ${PRODUCT_NAME}.`,
};

function t(locale: Locale, values: LocalizedText) {
  return values[locale];
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('https://') || trimmed.startsWith('http://localhost')) return trimmed;
  return '/';
}

function getSafeFallbackUrl(value: string) {
  return safeUrl(value);
}

function renderEmail(locale: Locale, title: string, body: string, ctaLabel: string, ctaUrl: string, footer?: string) {
  const url = escapeHtml(safeUrl(ctaUrl));
  return `<div lang="${locale}" style="font-family: Inter, Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a;"><div style="max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;"><div style="padding: 24px 28px; background: #020617; color: #fff;"><div style="font-size: 18px; font-weight: 700;">${PRODUCT_NAME}</div><div style="font-size: 13px; opacity: .82; margin-top: 4px;">${escapeHtml(t(locale, TAGLINE))}</div></div><div style="padding: 28px;"><h1 style="font-size: 24px; line-height: 1.2; margin: 0 0 12px;">${escapeHtml(title)}</h1><p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 18px;">${body}</p><a href="${url}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">${escapeHtml(ctaLabel)}</a></div><div style="padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">${escapeHtml(footer ?? t(locale, DEFAULT_FOOTER))}</div></div></div>`;
}

function buildEmail(input: { locale: Locale; template: EmailTemplateKey; subject: string; title: string; body: string; ctaLabel: string; ctaUrl: string; textLines: string[]; footer?: string; unsubscribeUrl?: string | null }): BuiltEmail {
  return {
    template: input.template,
    subject: input.subject,
    html: renderEmail(input.locale, input.title, input.body, input.ctaLabel, input.ctaUrl, input.footer),
    text: [...input.textLines, `${input.ctaLabel}: ${getSafeFallbackUrl(input.ctaUrl)}`].join('\n\n'),
    unsubscribeUrl: input.unsubscribeUrl ?? null,
  };
}

export function welcomeOnboardingEmail(input: WelcomeOnboardingEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subject = t(locale, {
    en: `Welcome to ${PRODUCT_NAME}`,
    pt: `Bem-vindo à ${PRODUCT_NAME}`,
    es: `Te damos la bienvenida a ${PRODUCT_NAME}`,
    fr: `Bienvenue sur ${PRODUCT_NAME}`,
    it: `Benvenuto in ${PRODUCT_NAME}`,
    de: `Willkommen bei ${PRODUCT_NAME}`,
  });
  const body = t(locale, {
    en: `Your ${escapeHtml(input.organizationName)} workspace is ready.`,
    pt: `O workspace ${escapeHtml(input.organizationName)} está pronto.`,
    es: `El workspace de ${escapeHtml(input.organizationName)} está listo.`,
    fr: `L’espace de travail ${escapeHtml(input.organizationName)} est prêt.`,
    it: `Il workspace ${escapeHtml(input.organizationName)} è pronto.`,
    de: `Der Workspace ${escapeHtml(input.organizationName)} ist bereit.`,
  });
  const ctaLabel = t(locale, { en: 'Start onboarding', pt: 'Iniciar onboarding', es: 'Iniciar onboarding', fr: 'Commencer l’onboarding', it: 'Avvia onboarding', de: 'Onboarding starten' });
  return buildEmail({ locale, template: 'welcome_onboarding', subject, title: subject, body, ctaLabel, ctaUrl: input.dashboardUrl, textLines: [subject, body.replace(/[<>]/g, '')] });
}

export function organizationCreatedEmail(input: OrganizationCreatedEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subject = t(locale, {
    en: `${input.organizationName} has been created in ${PRODUCT_NAME}`,
    pt: `${input.organizationName} foi criada na ${PRODUCT_NAME}`,
    es: `${input.organizationName} se ha creado en ${PRODUCT_NAME}`,
    fr: `${input.organizationName} a été créée dans ${PRODUCT_NAME}`,
    it: `${input.organizationName} è stata creata in ${PRODUCT_NAME}`,
    de: `${input.organizationName} wurde in ${PRODUCT_NAME} erstellt`,
  });
  const title = t(locale, {
    en: `${input.organizationName} has been created`,
    pt: `${input.organizationName} foi criada`,
    es: `${input.organizationName} se ha creado`,
    fr: `${input.organizationName} a été créée`,
    it: `${input.organizationName} è stata creata`,
    de: `${input.organizationName} wurde erstellt`,
  });
  const bodyText = input.createdByName
    ? t(locale, {
        en: `Created by: ${input.createdByName}.`,
        pt: `Criada por: ${input.createdByName}.`,
        es: `Creada por: ${input.createdByName}.`,
        fr: `Créée par : ${input.createdByName}.`,
        it: `Creata da: ${input.createdByName}.`,
        de: `Erstellt von: ${input.createdByName}.`,
      })
    : t(locale, {
        en: 'The organization workspace has been created.',
        pt: 'O workspace da organização foi criado.',
        es: 'Se ha creado el workspace de la organización.',
        fr: 'L’espace de travail de l’organisation a été créé.',
        it: 'Il workspace dell’organizzazione è stato creato.',
        de: 'Der Organisations-Workspace wurde erstellt.',
      });
  const body = escapeHtml(bodyText);
  const ctaLabel = t(locale, { en: 'Open organization', pt: 'Abrir organização', es: 'Abrir organización', fr: 'Ouvrir l’organisation', it: 'Apri organizzazione', de: 'Organisation öffnen' });
  return buildEmail({ locale, template: 'organization_created', subject, title, body, ctaLabel, ctaUrl: input.organizationUrl, textLines: [subject, bodyText] });
}

export function memberInvitedEmail(input: MemberInvitedEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subject = t(locale, {
    en: `Invitation to join ${input.organizationName} on ${PRODUCT_NAME}`,
    pt: `Convite para entrar em ${input.organizationName} na ${PRODUCT_NAME}`,
    es: `Invitación para unirte a ${input.organizationName} en ${PRODUCT_NAME}`,
    fr: `Invitation à rejoindre ${input.organizationName} sur ${PRODUCT_NAME}`,
    it: `Invito a unirti a ${input.organizationName} su ${PRODUCT_NAME}`,
    de: `Einladung zu ${input.organizationName} bei ${PRODUCT_NAME}`,
  });
  const invitedBy = input.invitedByName
    ? t(locale, { en: `${input.invitedByName} invited you`, pt: `${input.invitedByName} convidou-o`, es: `${input.invitedByName} te ha invitado`, fr: `${input.invitedByName} vous a invité`, it: `${input.invitedByName} ti ha invitato`, de: `${input.invitedByName} hat dich eingeladen` })
    : t(locale, { en: 'You were invited', pt: 'Foi convidado', es: 'Has recibido una invitación', fr: 'Vous avez été invité', it: 'Hai ricevuto un invito', de: 'Du wurdest eingeladen' });
  const roleLabel = t(locale, { en: 'Role', pt: 'Função', es: 'Rol', fr: 'Rôle', it: 'Ruolo', de: 'Rolle' });
  const body = t(locale, {
    en: `${escapeHtml(invitedBy)} to join ${escapeHtml(input.organizationName)} as ${escapeHtml(input.role)}.`,
    pt: `${escapeHtml(invitedBy)} para entrar em ${escapeHtml(input.organizationName)} como ${escapeHtml(input.role)}.`,
    es: `${escapeHtml(invitedBy)} para unirte a ${escapeHtml(input.organizationName)} como ${escapeHtml(input.role)}.`,
    fr: `${escapeHtml(invitedBy)} à rejoindre ${escapeHtml(input.organizationName)} en tant que ${escapeHtml(input.role)}.`,
    it: `${escapeHtml(invitedBy)} a unirti a ${escapeHtml(input.organizationName)} come ${escapeHtml(input.role)}.`,
    de: `${escapeHtml(invitedBy)}, ${escapeHtml(input.organizationName)} als ${escapeHtml(input.role)} beizutreten.`,
  });
  const ctaLabel = t(locale, { en: 'Review invitation', pt: 'Rever convite', es: 'Revisar invitación', fr: 'Consulter l’invitation', it: 'Controlla invito', de: 'Einladung prüfen' });
  const secureLink = t(locale, { en: 'Use the secure invitation link below. Do not forward this email.', pt: 'Use o link seguro abaixo. Não reencaminhe este email.', es: 'Usa el enlace seguro de invitación. No reenvíes este correo.', fr: 'Utilisez le lien d’invitation sécurisé ci-dessous. Ne transférez pas cet e-mail.', it: 'Usa il link di invito sicuro qui sotto. Non inoltrare questa email.', de: 'Verwende den sicheren Einladungslink unten. Leite diese E-Mail nicht weiter.' });
  return buildEmail({ locale, template: 'member_invited', subject, title: subject, body, ctaLabel, ctaUrl: input.inviteUrl, textLines: [subject, `${roleLabel}: ${input.role}`, secureLink] });
}

export function billingStartedEmail(input: BillingStartedEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subject = t(locale, { en: `Billing started for ${input.organizationName}`, pt: `Faturação iniciada para ${input.organizationName}`, es: `Facturación iniciada para ${input.organizationName}`, fr: `Facturation activée pour ${input.organizationName}`, it: `Fatturazione avviata per ${input.organizationName}`, de: `Abrechnung für ${input.organizationName} gestartet` });
  const title = t(locale, { en: `Billing is active for ${input.organizationName}`, pt: `A faturação está ativa para ${input.organizationName}`, es: `La facturación está activa para ${input.organizationName}`, fr: `La facturation est active pour ${input.organizationName}`, it: `La fatturazione è attiva per ${input.organizationName}`, de: `Die Abrechnung ist für ${input.organizationName} aktiv` });
  const body = t(locale, { en: `Your ${PRODUCT_NAME} subscription is active on the ${escapeHtml(input.planName)} plan.`, pt: `A subscrição ${PRODUCT_NAME} está ativa no plano ${escapeHtml(input.planName)}.`, es: `Tu suscripción de ${PRODUCT_NAME} está activa en el plan ${escapeHtml(input.planName)}.`, fr: `Votre abonnement ${PRODUCT_NAME} est actif avec le plan ${escapeHtml(input.planName)}.`, it: `Il tuo abbonamento ${PRODUCT_NAME} è attivo con il piano ${escapeHtml(input.planName)}.`, de: `Dein ${PRODUCT_NAME}-Abonnement ist im Tarif ${escapeHtml(input.planName)} aktiv.` });
  const ctaLabel = t(locale, { en: 'Open billing', pt: 'Abrir faturação', es: 'Abrir facturación', fr: 'Ouvrir la facturation', it: 'Apri fatturazione', de: 'Abrechnung öffnen' });
  const planLabel = t(locale, { en: 'Plan', pt: 'Plano', es: 'Plan', fr: 'Plan', it: 'Piano', de: 'Tarif' });
  return buildEmail({ locale, template: 'billing_started', subject, title, body, ctaLabel, ctaUrl: input.billingUrl, textLines: [subject, `${planLabel}: ${input.planName}`] });
}

export function invoiceFailedEmail(input: InvoiceFailedEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subject = t(locale, { en: `Billing issue detected for ${PRODUCT_NAME}`, pt: `Problema de faturação detetado na ${PRODUCT_NAME}`, es: `Problema de facturación detectado en ${PRODUCT_NAME}`, fr: `Problème de facturation détecté sur ${PRODUCT_NAME}`, it: `Problema di fatturazione rilevato su ${PRODUCT_NAME}`, de: `Abrechnungsproblem bei ${PRODUCT_NAME} erkannt` });
  const title = t(locale, { en: `Billing issue detected for ${input.organizationName}`, pt: `Problema de faturação detetado para ${input.organizationName}`, es: `Problema de facturación detectado para ${input.organizationName}`, fr: `Problème de facturation détecté pour ${input.organizationName}`, it: `Problema di fatturazione rilevato per ${input.organizationName}`, de: `Abrechnungsproblem für ${input.organizationName} erkannt` });
  const amountLabel = t(locale, { en: 'Amount due', pt: 'Valor em dívida', es: 'Importe pendiente', fr: 'Montant dû', it: 'Importo dovuto', de: 'Fälliger Betrag' });
  const dueLabel = t(locale, { en: 'Due date', pt: 'Data limite', es: 'Fecha límite', fr: 'Date d’échéance', it: 'Scadenza', de: 'Fälligkeitsdatum' });
  const details = [input.amountDue ? `${amountLabel}: ${input.amountDue}` : null, input.dueDate ? `${dueLabel}: ${input.dueDate}` : null].filter(Boolean) as string[];
  const fallback = t(locale, { en: 'Review billing status.', pt: 'Reveja o estado da faturação.', es: 'Revisa el estado de facturación.', fr: 'Vérifiez l’état de la facturation.', it: 'Controlla lo stato della fatturazione.', de: 'Prüfe den Abrechnungsstatus.' });
  const ctaLabel = t(locale, { en: 'Open billing', pt: 'Abrir faturação', es: 'Abrir facturación', fr: 'Ouvrir la facturation', it: 'Apri fatturazione', de: 'Abrechnung öffnen' });
  return buildEmail({ locale, template: 'invoice_failed', subject, title, body: escapeHtml(details.join(' · ') || fallback), ctaLabel, ctaUrl: input.billingUrl, textLines: [title, ...details] });
}

export function complianceDeadlineReminderEmail(input: ComplianceDeadlineReminderEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subject = t(locale, { en: `Compliance deadline reminder: ${input.deadlineName}`, pt: `Lembrete de prazo de compliance: ${input.deadlineName}`, es: `Recordatorio de plazo de compliance: ${input.deadlineName}`, fr: `Rappel d’échéance de conformité : ${input.deadlineName}`, it: `Promemoria scadenza compliance: ${input.deadlineName}`, de: `Erinnerung an Compliance-Frist: ${input.deadlineName}` });
  const title = t(locale, { en: 'Compliance deadline approaching', pt: 'Prazo de compliance a aproximar-se', es: 'Se acerca un plazo de compliance', fr: 'Une échéance de conformité approche', it: 'Si avvicina una scadenza di compliance', de: 'Compliance-Frist rückt näher' });
  const deadlineLabel = t(locale, { en: 'Deadline', pt: 'Prazo', es: 'Plazo', fr: 'Échéance', it: 'Scadenza', de: 'Frist' });
  const dueLabel = t(locale, { en: 'Due date', pt: 'Data limite', es: 'Fecha límite', fr: 'Date limite', it: 'Data limite', de: 'Fällig am' });
  const body = `${deadlineLabel}: ${escapeHtml(input.deadlineName)}. ${dueLabel}: ${escapeHtml(input.dueDate)}.`;
  const ctaLabel = t(locale, { en: 'Review deadline', pt: 'Rever prazo', es: 'Revisar plazo', fr: 'Consulter l’échéance', it: 'Controlla scadenza', de: 'Frist prüfen' });
  const footer = input.unsubscribeUrl ? t(locale, { en: `Reminder sent by ${PRODUCT_NAME}.`, pt: `Lembrete enviado pela ${PRODUCT_NAME}.`, es: `Recordatorio enviado por ${PRODUCT_NAME}.`, fr: `Rappel envoyé par ${PRODUCT_NAME}.`, it: `Promemoria inviato da ${PRODUCT_NAME}.`, de: `Erinnerung gesendet von ${PRODUCT_NAME}.` }) : undefined;
  return buildEmail({ locale, template: 'compliance_deadline_reminder', subject, title, body, ctaLabel, ctaUrl: input.dashboardUrl, textLines: [subject, `${deadlineLabel}: ${input.deadlineName}`, `${dueLabel}: ${input.dueDate}`], footer, unsubscribeUrl: input.unsubscribeUrl });
}

export function exportReadyEmail(input: ExportReadyEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subject = t(locale, { en: `Your ${input.exportName} export is ready`, pt: `A exportação ${input.exportName} está pronta`, es: `Tu exportación ${input.exportName} está lista`, fr: `Votre export ${input.exportName} est prêt`, it: `L’esportazione ${input.exportName} è pronta`, de: `Dein Export ${input.exportName} ist bereit` });
  const title = t(locale, { en: 'Your export is ready', pt: 'A sua exportação está pronta', es: 'Tu exportación está lista', fr: 'Votre export est prêt', it: 'La tua esportazione è pronta', de: 'Dein Export ist bereit' });
  const body = t(locale, { en: `The export ${escapeHtml(input.exportName)} has finished processing.`, pt: `A exportação ${escapeHtml(input.exportName)} terminou o processamento.`, es: `La exportación ${escapeHtml(input.exportName)} ha terminado de procesarse.`, fr: `Le traitement de l’export ${escapeHtml(input.exportName)} est terminé.`, it: `L’elaborazione dell’esportazione ${escapeHtml(input.exportName)} è terminata.`, de: `Die Verarbeitung des Exports ${escapeHtml(input.exportName)} ist abgeschlossen.` });
  const ctaLabel = t(locale, { en: 'Open exports', pt: 'Abrir exportações', es: 'Abrir exportaciones', fr: 'Ouvrir les exports', it: 'Apri esportazioni', de: 'Exporte öffnen' });
  return buildEmail({ locale, template: 'export_ready', subject, title, body, ctaLabel, ctaUrl: input.exportsUrl, textLines: [subject, `Open ${PRODUCT_NAME}.`] });
}

export function securityAlertEmail(input: SecurityAlertEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subjectPrefix = t(locale, { en: 'Security alert', pt: 'Alerta de segurança', es: 'Alerta de seguridad', fr: 'Alerte de sécurité', it: 'Avviso di sicurezza', de: 'Sicherheitswarnung' });
  const occurredLabel = t(locale, { en: 'Occurred at', pt: 'Ocorreu em', es: 'Ocurrió el', fr: 'Survenu le', it: 'Avvenuto il', de: 'Aufgetreten am' });
  const ipLabel = t(locale, { en: 'IP address', pt: 'Endereço IP', es: 'Dirección IP', fr: 'Adresse IP', it: 'Indirizzo IP', de: 'IP-Adresse' });
  const locationLabel = t(locale, { en: 'Location', pt: 'Localização', es: 'Ubicación', fr: 'Localisation', it: 'Posizione', de: 'Standort' });
  const details = [`${occurredLabel}: ${input.occurredAt}`, input.ipAddress ? `${ipLabel}: ${input.ipAddress}` : null, input.location ? `${locationLabel}: ${input.location}` : null].filter(Boolean) as string[];
  const ctaLabel = t(locale, { en: 'Review activity', pt: 'Rever atividade', es: 'Revisar actividad', fr: 'Examiner l’activité', it: 'Controlla attività', de: 'Aktivität prüfen' });
  return buildEmail({ locale, template: 'security_alert', subject: `${subjectPrefix}: ${input.alertTitle}`, title: input.alertTitle, body: escapeHtml(details.join(' · ')), ctaLabel, ctaUrl: input.securityUrl, textLines: [`${subjectPrefix} — ${input.organizationName}: ${input.alertTitle}`, ...details] });
}

export function trialUpgradeEmail(input: TrialUpgradeEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const days = input.daysRemaining ?? 3;
  const subject = t(locale, { en: `Your ${PRODUCT_NAME} trial period is ending`, pt: `O período de teste existente da ${PRODUCT_NAME} está a terminar`, es: `Tu período de prueba existente de ${PRODUCT_NAME} está terminando`, fr: `Votre période d’essai existante sur ${PRODUCT_NAME} se termine`, it: `Il periodo di prova esistente su ${PRODUCT_NAME} sta terminando`, de: `Deine bestehende ${PRODUCT_NAME}-Testphase endet` });
  const title = t(locale, { en: `The trial period for ${input.organizationName} is ending`, pt: `O período de teste de ${input.organizationName} está a terminar`, es: `El período de prueba de ${input.organizationName} está terminando`, fr: `La période d’essai de ${input.organizationName} se termine`, it: `Il periodo di prova di ${input.organizationName} sta terminando`, de: `Die Testphase für ${input.organizationName} endet` });
  const daysLabel = t(locale, { en: 'Days remaining', pt: 'Dias restantes', es: 'Días restantes', fr: 'Jours restants', it: 'Giorni rimanenti', de: 'Verbleibende Tage' });
  const body = t(locale, { en: `This existing trial period has about ${days} day${days === 1 ? '' : 's'} remaining.`, pt: `Este período de teste existente tem cerca de ${days} dia${days === 1 ? '' : 's'} restante${days === 1 ? '' : 's'}.`, es: `Este período de prueba existente tiene aproximadamente ${days} día${days === 1 ? '' : 's'} restante${days === 1 ? '' : 's'}.`, fr: `Cette période d’essai existante se termine dans environ ${days} jour${days === 1 ? '' : 's'}.`, it: `Questo periodo di prova esistente termina tra circa ${days} giorn${days === 1 ? 'o' : 'i'}.`, de: `Diese bestehende Testphase endet in etwa ${days} Tag${days === 1 ? '' : 'en'}.` });
  const ctaLabel = t(locale, { en: 'Review billing options', pt: 'Rever opções de faturação', es: 'Revisar opciones de facturación', fr: 'Consulter les options de facturation', it: 'Controlla opzioni di fatturazione', de: 'Abrechnungsoptionen prüfen' });
  return buildEmail({ locale, template: 'trial_upgrade', subject, title, body, ctaLabel, ctaUrl: input.billingUrl, textLines: [title, body, `${daysLabel}: ${days}`] });
}

export function documentExpiringEmail(input: DocumentExpiringEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subject = t(locale, { en: 'Document review required', pt: 'Revisão de documento necessária', es: 'Se requiere revisión del documento', fr: 'Révision du document requise', it: 'Revisione del documento necessaria', de: 'Dokumentenprüfung erforderlich' });
  const title = t(locale, { en: `Document review required for ${input.organizationName}`, pt: `Revisão de documento necessária para ${input.organizationName}`, es: `Se requiere revisión de documento para ${input.organizationName}`, fr: `Révision de document requise pour ${input.organizationName}`, it: `Revisione del documento necessaria per ${input.organizationName}`, de: `Dokumentenprüfung für ${input.organizationName} erforderlich` });
  const documentLabel = t(locale, { en: 'Document', pt: 'Documento', es: 'Documento', fr: 'Document', it: 'Documento', de: 'Dokument' });
  const reviewLabel = t(locale, { en: 'Review date', pt: 'Data de revisão', es: 'Fecha de revisión', fr: 'Date de révision', it: 'Data di revisione', de: 'Prüfdatum' });
  const body = `${documentLabel}: ${escapeHtml(input.documentName)}. ${reviewLabel}: ${escapeHtml(input.expiresAt)}.`;
  const ctaLabel = t(locale, { en: 'Review documents', pt: 'Rever documentos', es: 'Revisar documentos', fr: 'Examiner les documents', it: 'Controlla documenti', de: 'Dokumente prüfen' });
  return buildEmail({ locale, template: 'document_expiring', subject, title, body, ctaLabel, ctaUrl: input.documentsUrl, textLines: [title, `${documentLabel}: ${input.documentName}`, `${reviewLabel}: ${input.expiresAt}`] });
}

export function vendorReviewEmail(input: VendorReviewEmailInput): BuiltEmail {
  const locale = resolveRecipientLocale(input.locale);
  const subject = t(locale, { en: 'Vendor review pending', pt: 'Revisão de fornecedor pendente', es: 'Revisión de proveedor pendiente', fr: 'Révision fournisseur en attente', it: 'Revisione fornitore in sospeso', de: 'Anbieterprüfung ausstehend' });
  const title = t(locale, { en: `Vendor review pending for ${input.organizationName}`, pt: `Revisão de fornecedor pendente para ${input.organizationName}`, es: `Revisión de proveedor pendiente para ${input.organizationName}`, fr: `Révision fournisseur en attente pour ${input.organizationName}`, it: `Revisione fornitore in sospeso per ${input.organizationName}`, de: `Anbieterprüfung für ${input.organizationName} ausstehend` });
  const vendorLabel = t(locale, { en: 'Vendor', pt: 'Fornecedor', es: 'Proveedor', fr: 'Fournisseur', it: 'Fornitore', de: 'Anbieter' });
  const dueText = input.reviewDueAt
    ? t(locale, { en: `Review due: ${input.reviewDueAt}.`, pt: `Revisão até: ${input.reviewDueAt}.`, es: `Revisión prevista: ${input.reviewDueAt}.`, fr: `Révision prévue : ${input.reviewDueAt}.`, it: `Revisione prevista: ${input.reviewDueAt}.`, de: `Prüfung fällig: ${input.reviewDueAt}.` })
    : t(locale, { en: 'A vendor review is pending.', pt: 'Existe uma revisão de fornecedor pendente.', es: 'Hay una revisión de proveedor pendiente.', fr: 'Une révision fournisseur est en attente.', it: 'È in sospeso una revisione del fornitore.', de: 'Eine Anbieterprüfung ist ausstehend.' });
  const body = `${vendorLabel}: ${escapeHtml(input.vendorName)}. ${escapeHtml(dueText)}`;
  const ctaLabel = t(locale, { en: 'Review vendors', pt: 'Rever fornecedores', es: 'Revisar proveedores', fr: 'Examiner les fournisseurs', it: 'Controlla fornitori', de: 'Anbieter prüfen' });
  return buildEmail({ locale, template: 'vendor_review', subject, title, body, ctaLabel, ctaUrl: input.vendorsUrl, textLines: [title, `${vendorLabel}: ${input.vendorName}`, dueText] });
}

export const onboardingEmail = welcomeOnboardingEmail;
export const invitationEmail = memberInvitedEmail;
export const paymentFailedEmail = invoiceFailedEmail;
