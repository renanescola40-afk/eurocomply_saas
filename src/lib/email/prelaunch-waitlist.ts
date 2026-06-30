import 'server-only';

import { sendEmail } from '@/lib/email/client';

type WaitlistEmailInput = {
  to: string;
  companyName: string;
  role: string;
  locale: string;
  joinedAt: string;
  launchAt: string;
  waitlistUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatJoinedAt(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : 'en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Lisbon',
  }).format(new Date(value));
}

function formatRemaining(joinedAt: string, launchAt: string, locale: string) {
  const seconds = Math.max(0, Math.floor((Date.parse(launchAt) - Date.parse(joinedAt)) / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return locale === 'pt' ? `${days} dias, ${hours} horas e ${minutes} minutos` : `${days} days, ${hours} hours and ${minutes} minutes`;
}

export async function sendPrelaunchWaitlistEmail(input: WaitlistEmailInput) {
  const isPt = input.locale === 'pt';
  const joinedAt = formatJoinedAt(input.joinedAt, input.locale);
  const launchLabel = isPt ? '1 de agosto de 2026, 07:00 Europe/Lisbon' : '1 August 2026, 07:00 Europe/Lisbon';
  const remaining = formatRemaining(input.joinedAt, input.launchAt, input.locale);
  const headline = isPt
    ? 'Você está inscrito na lista de espera da Risck Comply — e você é especial.'
    : 'You are on the Risck Comply waitlist — and you are special.';
  const text = [
    headline,
    `${isPt ? 'Empresa' : 'Company'}: ${input.companyName}`,
    `${isPt ? 'Cargo' : 'Role'}: ${input.role}`,
    `${isPt ? 'Inscrição' : 'Joined'}: ${joinedAt}`,
    `${isPt ? 'Abertura' : 'Launch'}: ${launchLabel}`,
    `${isPt ? 'Tempo restante' : 'Time remaining'}: ${remaining}`,
    input.waitlistUrl,
  ].join('\n\n');
  const html = `<p>${escapeHtml(headline)}</p><p>${escapeHtml(text).replaceAll('\n', '<br />')}</p>`;

  return sendEmail({
    to: input.to,
    subject: isPt ? 'Você está na lista de espera da Risck Comply' : 'You are on the Risck Comply waitlist',
    html,
    text,
    template: 'welcome_onboarding',
    idempotencyKey: `prelaunch-waitlist:${input.to.toLowerCase()}`,
    metadata: { source: 'prelaunch_waitlist', locale: input.locale },
  });
}
