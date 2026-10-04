import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const LEADS = new URL('../../src/app/api/leads/route.ts', import.meta.url);
const SENDER = new URL('../../src/lib/email/server-sender.ts', import.meta.url);
const TEMPLATES = new URL('../../src/lib/email/templates.ts', import.meta.url);

describe('sales lead email notifications', () => {
  it('routes internal lead notifications to the commercial mailbox', async () => {
    const source = await readFile(LEADS, 'utf8');

    expect(source).toContain("const SALES_MAILBOX = 'comercial@risckcomply.com'");
    expect(source).toContain('to: SALES_MAILBOX');
    expect(source).toContain('replyTo: record.work_email');
    expect(source).toContain("template: 'sales_lead_internal'");
  });

  it('acknowledges the customer and routes replies to the commercial mailbox', async () => {
    const source = await readFile(LEADS, 'utf8');

    expect(source).toContain('to: record.work_email');
    expect(source).toContain('replyTo: SALES_MAILBOX');
    expect(source).toContain('plan: acknowledgement.plan');
    expect(source).toContain("const match = source.match(/^contact-sales-([a-z0-9_-]+)$/i)");
    expect(source).toContain('const plan = getBillingPlan(match?.[1])');
    expect(source).toContain("template: 'sales_lead_acknowledgement'");
    expect(source).toContain('Recebemos o seu pedido comercial');
    expect(source).toContain('We received your sales request');
    expect(source).toContain('Resumo do pedido');
    expect(source).toContain('Request summary');
    expect(source).toContain('Próximos passos');
    expect(source).toContain('Next steps');
    expect(source).toContain('Enterprise AI Act Compliance');
    expect(source).toContain('AI Act compliance readiness & evidence operations');
    expect(source).toContain('www.risckcomply.com');
  });

  it('preserves the lead even if an email provider delivery fails', async () => {
    const source = await readFile(LEADS, 'utf8');

    expect(source).toContain('await Promise.allSettled([');
    expect(source).toContain('Internal sales notification delivery failed');
    expect(source).toContain('Customer acknowledgement delivery failed');
    expect(source.indexOf('if (!savedToSupabase && !sentToWebhook)')).toBeLessThan(source.indexOf('await sendLeadEmails(record)'));
  });

  it('supports Resend reply_to and dedicated audit template keys', async () => {
    const [sender, templates] = await Promise.all([readFile(SENDER, 'utf8'), readFile(TEMPLATES, 'utf8')]);

    expect(sender).toContain('replyTo?: string');
    expect(sender).toContain('reply_to: input.replyTo');
    expect(templates).toContain("'sales_lead_internal'");
    expect(templates).toContain("'sales_lead_acknowledgement'");
  });
});
