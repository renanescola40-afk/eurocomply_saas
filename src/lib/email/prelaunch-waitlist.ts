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

type InternalWaitlistNotificationInput = WaitlistEmailInput & {
  totalLeads: number | null;
  notifyTo?: string | null;
};

const INTERNAL_WAITLIST_NOTIFY_EMAIL = 'comercial@risckcomply.com';
const WAITLIST_COMMERCIAL_FROM = 'RISCK COMPLY <comercial@risckcomply.com>';

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
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

function premiumEmailShell(title: string, preview: string, body: string) {
  return `
  <div style="margin:0;padding:0;background:#05070b;color:#f8fafc;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${escapeHtml(preview)}</div>
    <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
      <div style="border:1px solid rgba(148,163,184,.24);border-radius:28px;overflow:hidden;background:linear-gradient(135deg,#08111f 0%,#071a18 48%,#05070b 100%);box-shadow:0 24px 80px rgba(0,0,0,.42);">
        <div style="padding:28px 30px;border-bottom:1px solid rgba(148,163,184,.18);">
          <div style="font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#67e8f9;font-weight:700;">RISCK COMPLY</div>
          <h1 style="margin:16px 0 0;font-size:28px;line-height:1.15;color:#ffffff;letter-spacing:-.03em;">${escapeHtml(title)}</h1>
          <p style="margin:12px 0 0;color:#cbd5e1;font-size:15px;line-height:1.7;">AI governance, EU AI Act readiness and compliance evidence for enterprise teams.</p>
        </div>
        ${body}
        <div style="padding:22px 30px;border-top:1px solid rgba(148,163,184,.18);color:#94a3b8;font-size:12px;line-height:1.7;">
          You are receiving this message because this email was used on the Risck Comply early access waitlist.<br />
          Commercial contact: <a href="mailto:comercial@risckcomply.com" style="color:#e0f2fe;">comercial@risckcomply.com</a>
        </div>
      </div>
    </div>
  </div>`;
}

export async function sendPrelaunchWaitlistEmail(input: WaitlistEmailInput) {
  const isPt = input.locale === 'pt';
  const joinedAt = formatJoinedAt(input.joinedAt, input.locale);
  const launchLabel = isPt ? '1 de agosto de 2026, 07:00 Europe/Lisbon' : '1 August 2026, 07:00 Europe/Lisbon';
  const remaining = formatRemaining(input.joinedAt, input.launchAt, input.locale);
  const title = isPt ? 'Você está na lista enterprise da Risck Comply' : 'You are on the Risck Comply enterprise waitlist';
  const preview = isPt ? 'O seu lugar prioritário foi confirmado.' : 'Your priority place has been confirmed.';
  const cta = isPt ? 'Ver página de lançamento' : 'View launch page';
  const intro = isPt
    ? 'O seu lugar prioritário foi confirmado. Você está entre os contactos que queremos ouvir primeiro antes da abertura oficial.'
    : 'Your priority place has been confirmed. You are one of the contacts we want to hear from first before the official opening.';
  const valueItems = isPt
    ? ['Inventário de IA para mapear sistemas, fornecedores e owners.', 'Classificação inicial de risco alinhada ao EU AI Act.', 'Documentos e evidence packs para compradores, auditorias e governança.', 'Workflows para equipas, tarefas, políticas internas e audit trail.']
    : ['AI inventory to map systems, vendors and owners.', 'Initial EU AI Act readiness and risk classification.', 'Documents and evidence packs for buyers, audits and governance.', 'Team workflows for tasks, internal policies and audit trail.'];

  const body = `
    <div style="padding:28px 30px;">
      <p style="margin:0;color:#e2e8f0;font-size:16px;line-height:1.75;">${escapeHtml(intro)}</p>
      <div style="margin-top:22px;border:1px solid rgba(125,211,252,.22);border-radius:20px;background:rgba(8,47,73,.28);padding:18px;">
        <div style="color:#67e8f9;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;">${isPt ? 'Detalhes da inscrição' : 'Registration details'}</div>
        <p style="margin:12px 0 0;color:#f8fafc;line-height:1.8;font-size:14px;">
          <strong>${isPt ? 'Empresa' : 'Company'}:</strong> ${escapeHtml(input.companyName)}<br />
          <strong>${isPt ? 'Cargo' : 'Role'}:</strong> ${escapeHtml(input.role)}<br />
          <strong>${isPt ? 'Inscrição' : 'Joined'}:</strong> ${escapeHtml(joinedAt)}<br />
          <strong>${isPt ? 'Abertura' : 'Launch'}:</strong> ${escapeHtml(launchLabel)}<br />
          <strong>${isPt ? 'Tempo restante' : 'Time remaining'}:</strong> ${escapeHtml(remaining)}
        </p>
      </div>
      <div style="margin-top:22px;">
        <div style="color:#ffffff;font-size:16px;font-weight:800;">${isPt ? 'O que a Risck Comply vai oferecer' : 'What Risck Comply will offer'}</div>
        <ul style="margin:12px 0 0;padding-left:20px;color:#cbd5e1;font-size:14px;line-height:1.8;">
          ${valueItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      <a href="${escapeHtml(input.waitlistUrl)}" style="display:inline-block;margin-top:24px;background:#ffffff;color:#020617;text-decoration:none;padding:13px 18px;border-radius:14px;font-weight:800;font-size:14px;">${escapeHtml(cta)}</a>
      <p style="margin:22px 0 0;color:#94a3b8;font-size:13px;line-height:1.7;">${isPt ? 'Se tiver dúvidas, responda este email ou fale connosco pelo contacto comercial abaixo.' : 'If you have questions, reply to this email or contact our commercial team below.'}</p>
    </div>`;

  const text = [
    title,
    intro,
    `${isPt ? 'Empresa' : 'Company'}: ${input.companyName}`,
    `${isPt ? 'Cargo' : 'Role'}: ${input.role}`,
    `${isPt ? 'Inscrição' : 'Joined'}: ${joinedAt}`,
    `${isPt ? 'Abertura' : 'Launch'}: ${launchLabel}`,
    `${isPt ? 'Tempo restante' : 'Time remaining'}: ${remaining}`,
    isPt ? 'O que vamos oferecer:' : 'What we will offer:',
    ...valueItems.map((item) => `- ${item}`),
    input.waitlistUrl,
    'comercial@risckcomply.com',
  ].join('\n\n');

  return sendEmail({
    to: input.to,
    from: WAITLIST_COMMERCIAL_FROM,
    subject: isPt ? 'O seu acesso prioritário à Risck Comply foi confirmado' : 'Your Risck Comply priority access is confirmed',
    html: premiumEmailShell(title, preview, body),
    text,
    template: 'welcome_onboarding',
    idempotencyKey: `prelaunch-waitlist:${input.to.toLowerCase()}`,
    metadata: { source: 'prelaunch_waitlist', locale: input.locale },
  });
}

export async function sendInternalWaitlistNotification(input: InternalWaitlistNotificationInput) {
  const recipient = input.notifyTo || INTERNAL_WAITLIST_NOTIFY_EMAIL;
  const joinedAt = formatJoinedAt(input.joinedAt, 'pt');
  const totalText = input.totalLeads === null ? 'Total ainda indisponível' : `${input.totalLeads} pessoas já se inscreveram`;
  const subject = `Novo lead waitlist: ${input.companyName}`;
  const text = [
    'Novo lead na lista de espera da Risck Comply',
    `Empresa/Nome: ${input.companyName}`,
    `Email: ${input.to}`,
    `Cargo: ${input.role}`,
    `Inscrição: ${joinedAt}`,
    `Total: ${totalText}`,
    `Página: ${input.waitlistUrl}`,
  ].join('\n\n');
  const body = `
    <div style="padding:28px 30px;">
      <p style="margin:0;color:#e2e8f0;font-size:16px;line-height:1.75;">Novo contacto entrou na lista de espera.</p>
      <div style="margin-top:18px;border:1px solid rgba(125,211,252,.22);border-radius:18px;background:rgba(8,47,73,.28);padding:18px;color:#f8fafc;font-size:14px;line-height:1.8;">
        <strong>Empresa/Nome:</strong> ${escapeHtml(input.companyName)}<br />
        <strong>Email:</strong> ${escapeHtml(input.to)}<br />
        <strong>Cargo:</strong> ${escapeHtml(input.role)}<br />
        <strong>Inscrição:</strong> ${escapeHtml(joinedAt)}<br />
        <strong>Total:</strong> ${escapeHtml(totalText)}
      </div>
    </div>`;

  return sendEmail({
    to: recipient,
    subject,
    html: premiumEmailShell('Novo lead na lista de espera', 'Novo contacto entrou na waitlist.', body),
    text,
    template: 'welcome_onboarding',
    idempotencyKey: `internal-prelaunch-waitlist:${input.to.toLowerCase()}:${input.joinedAt}`,
    metadata: { source: 'prelaunch_waitlist_internal', locale: input.locale },
  });
}
