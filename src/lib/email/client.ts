import { reportError } from '@/lib/observability/report-error';

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

type SendEmailResult = {
  sent: boolean;
  provider: 'resend' | 'console';
  id?: string;
};

function getDefaultFromAddress() {
  return process.env.EMAIL_FROM ?? 'RISCK COMPLY <no-reply@risckcomply.app>';
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = input.from ?? getDefaultFromAddress();

  if (!apiKey) {
    console.info('[RISCK COMPLY notification skipped]', { code: 'provider_not_configured' });

    return { sent: false, provider: 'console' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Resend email failed with status ${response.status}`);
    reportError(error, { area: 'email_send', status: response.status, body: body.slice(0, 300), to: input.to, subject: input.subject });
    throw error;
  }

  const data = (await response.json()) as { id?: string };
  return { sent: true, provider: 'resend', id: data.id };
}
