import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';

const PRODUCT_NAME = 'Risck Comply';

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

export function localizedInvitationEmail(input: {
  organizationName: string;
  role: string;
  inviteUrl: string;
  locale: string;
}) {
  const copy = getTeamWorkflowCopy(input.locale).email;
  const organization = escapeHtml(input.organizationName);
  const role = escapeHtml(input.role);
  const url = escapeHtml(safeUrl(input.inviteUrl));
  const subject = copy.subject(input.organizationName);
  const title = copy.title(input.organizationName);
  const body = copy.body(input.organizationName, input.role);

  return {
    template: 'member_invited' as const,
    subject,
    html: `<div style="font-family: Inter, Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a;"><div style="max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;"><div style="padding: 24px 28px; background: #020617; color: #fff;"><div style="font-size: 18px; font-weight: 700;">${PRODUCT_NAME}</div><div style="font-size: 13px; opacity: .82; margin-top: 4px;">${escapeHtml(copy.header)}</div></div><div style="padding: 28px;"><h1 style="font-size: 24px; line-height: 1.2; margin: 0 0 12px;">${escapeHtml(title)}</h1><p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 18px;">${escapeHtml(body)}</p><p style="font-size: 13px; color: #64748b; margin: 0 0 18px;">${escapeHtml(copy.role)}: ${role}</p><a href="${url}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">${escapeHtml(copy.cta)}</a></div><div style="padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">${escapeHtml(copy.secureLink)}<br/>${escapeHtml(copy.footer)}</div></div></div>`,
    text: [copy.invitedBy, body, `${copy.role}: ${input.role}`, copy.secureLink, `${copy.cta}: ${safeUrl(input.inviteUrl)}`].join('\n\n'),
    unsubscribeUrl: null,
    organization,
  };
}
