import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsProperties } from '@/lib/analytics/events';

describe('analytics privacy controls', () => {
  it('keeps safe activation properties', () => {
    expect(
      sanitizeAnalyticsProperties({
        source: 'onboarding',
        locale: 'pt',
        plan: 'growth',
        count: 1,
        has_organization: true,
        organization_id: 'org_internal_123',
        clerk_org_id: 'org_clerk_123',
      }),
    ).toEqual({
      source: 'onboarding',
      locale: 'pt',
      plan: 'growth',
      count: 1,
      has_organization: true,
      organization_id: 'org_internal_123',
      clerk_org_id: 'org_clerk_123',
    });
  });

  it('removes direct personal and compliance fields', () => {
    expect(
      sanitizeAnalyticsProperties({
        email: 'founder@example.com',
        company_name: 'Acme Compliance Ltd',
        document_title: 'High risk AI policy.pdf',
        filename: 'customer-register.csv',
        risk_detail: 'Sensitive internal risk note',
        vendor_name: 'Private vendor',
        vat_number: 'PT123456789',
        address: 'Private office address',
        phone: '+351000000000',
        token: 'secret-token',
        source: 'upload',
      }),
    ).toEqual({
      source: 'upload',
    });
  });

  it('drops undefined values and unknown strings', () => {
    expect(
      sanitizeAnalyticsProperties({
        source: undefined,
        unknown_label: 'should not pass',
        unknown_count: 2,
        unknown_enabled: false,
      }),
    ).toEqual({
      unknown_count: 2,
      unknown_enabled: false,
    });
  });
});
