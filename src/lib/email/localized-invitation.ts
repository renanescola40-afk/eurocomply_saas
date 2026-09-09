import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';

const PRODUCT_NAME = 'Risck Comply';
const SUPPORTED_LOCALES = new Set(['en', 'pt', 'es', 'fr', 'it', 'de']);

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

function normalizeLocale(locale: string) {
  const normalized = locale.trim().toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.has(normalized) ? normalized : 'en';
}

function isTrustedPrivacyOrigin(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (url.protocol === 'https:' && (hostname === 'risckcomply.com' || hostname.endsWith('.risckcomply.com'))) return true;
  return url.protocol === 'http:' && hostname === 'localhost';
}

function privacyUrlForInvite(inviteUrl: string, locale: string) {
  const privacyPath = `/${normalizeLocale(locale)}/privacy`;
  const safeInviteUrl = safeUrl(inviteUrl);

  if (safeInviteUrl.startsWith('https://') || safeInviteUrl.startsWith('http://localhost')) {
    try {
      const parsed = new URL(safeInviteUrl);
      return isTrustedPrivacyOrigin(parsed) ? `${parsed.origin}${privacyPath}` : privacyPath;
    } catch {
      return privacyPath;
    }
  }

  return privacyPath;
}

function invitationPrivacyCopy(locale: string, organizationName: string) {
  const normalized = normalizeLocale(locale);
  const copy = {
    en: {
      source: `Your email address was provided by an administrator of ${organizationName} so Risck Comply can send and manage this invitation.`,
      purpose: 'If you do not accept the invitation, you do not need to create an account.',
      link: 'Privacy information',
    },
    pt: {
      source: `O seu endereço de email foi fornecido por um administrador de ${organizationName} para que o Risck Comply possa enviar e gerir este convite.`,
      purpose: 'Se não aceitar o convite, não precisa de criar uma conta.',
      link: 'Informação de privacidade',
    },
    es: {
      source: `Un administrador de ${organizationName} proporcionó tu dirección de correo para que Risck Comply pueda enviar y gestionar esta invitación.`,
      purpose: 'Si no aceptas la invitación, no necesitas crear una cuenta.',
      link: 'Información de privacidad',
    },
    fr: {
      source: `Votre adresse e-mail a été fournie par un administrateur de ${organizationName} afin que Risck Comply puisse envoyer et gérer cette invitation.`,
      purpose: `Si vous n'acceptez pas l'invitation, vous n'avez pas besoin de créer de compte.`,
      link: 'Informations de confidentialité',
    },
    it: {
      source: `Il tuo indirizzo email è stato fornito da un amministratore di ${organizationName} affinché Risck Comply possa inviare e gestire questo invito.`,
      purpose: `Se non accetti l'invito, non è necessario creare un account.`,
      link: 'Informazioni sulla privacy',
    },
    de: {
      source: `Ihre E-Mail-Adresse wurde von einem Administrator von ${organizationName} bereitgestellt, damit Risck Comply diese Einladung senden und verwalten kann.`,
      purpose: 'Wenn Sie die Einladung nicht annehmen, müssen Sie kein Konto erstellen.',
      link: 'Datenschutzinformationen',
    },
  } as const;

  return copy[normalized as keyof typeof copy];
}

export function localizedInvitationEmail(input: {
  organizationName: string;
  role: string;
  inviteUrl: string;
  locale: string;
}) {
  const copy = getTeamWorkflowCopy(input.locale).email;
  const privacyCopy = invitationPrivacyCopy(input.locale, input.organizationName);
  const organization = escapeHtml(input.organizationName);
  const role = escapeHtml(input.role);
  const url = escapeHtml(safeUrl(input.inviteUrl));
  const privacyUrl = privacyUrlForInvite(input.inviteUrl, input.locale);
  const escapedPrivacyUrl = escapeHtml(privacyUrl);
  const subject = copy.subject(input.organizationName);
  const title = copy.title(input.organizationName);
  const body = copy.body(input.organizationName, input.role);

  return {
    template: 'member_invited' as const,
    subject,
    html: `<div style="font-family: Inter, Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a;"><div style="max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;"><div style="padding: 24px 28px; background: #020617; color: #fff;"><div style="font-size: 18px; font-weight: 700;">${PRODUCT_NAME}</div><div style="font-size: 13px; opacity: .82; margin-top: 4px;">${escapeHtml(copy.header)}</div></div><div style="padding: 28px;"><h1 style="font-size: 24px; line-height: 1.2; margin: 0 0 12px;">${escapeHtml(title)}</h1><p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 18px;">${escapeHtml(body)}</p><p style="font-size: 13px; color: #64748b; margin: 0 0 18px;">${escapeHtml(copy.role)}: ${role}</p><a href="${url}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">${escapeHtml(copy.cta)}</a><div style="margin-top: 24px; padding: 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px; line-height: 1.6; color: #475569;"><p style="margin: 0 0 8px;">${escapeHtml(privacyCopy.source)}</p><p style="margin: 0 0 8px;">${escapeHtml(privacyCopy.purpose)}</p><a href="${escapedPrivacyUrl}" style="color: #1d4ed8;">${escapeHtml(privacyCopy.link)}</a></div></div><div style="padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">${escapeHtml(copy.secureLink)}<br/>${escapeHtml(copy.footer)}</div></div></div>`,
    text: [
      copy.invitedBy,
      body,
      `${copy.role}: ${input.role}`,
      copy.secureLink,
      `${copy.cta}: ${safeUrl(input.inviteUrl)}`,
      privacyCopy.source,
      privacyCopy.purpose,
      `${privacyCopy.link}: ${privacyUrl}`,
    ].join('\n\n'),
    unsubscribeUrl: null,
    organization,
  };
}
