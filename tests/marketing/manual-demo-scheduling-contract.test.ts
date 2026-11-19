import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const demoPage = readFileSync('src/app/[locale]/book-demo/page.tsx', 'utf8');
const demoForm = readFileSync('src/components/marketing/book-demo-form.tsx', 'utf8');
const launchPlan = readFileSync('docs/sales/ASSISTED_COMMERCIAL_LAUNCH_2026-11-20.md', 'utf8');

describe('manual demo scheduling launch contract', () => {
  it('makes the demo form a request rather than claiming a reserved meeting', () => {
    expect(demoPage).toContain('Request a demo for AI inventory');
    expect(demoForm).toContain("'Request a demo'");
    expect(demoForm).toContain('Sending this request does not confirm a booking.');
    expect(demoForm).toContain('No meeting is booked yet.');
    expect(demoForm).toContain("fetch('/api/leads'");
  });

  it('preserves consent and plan-intent capture for manual sales follow-up', () => {
    expect(demoForm).toContain("consentToContact: formData.get('consentToContact') === 'on'");
    expect(demoForm).toContain('contact-sales-${planIntent}');
    expect(demoForm).toContain('data-cta-id="book-demo-submit"');
    expect(launchPlan).toContain('Manual demo scheduling — owner-approved');
    expect(launchPlan).toContain('two or three actual available 30-minute slots');
    expect(launchPlan).toContain('comercial@risckcomply.com');
  });
});
