import { describe, expect, it } from 'vitest';

import { formatLimit, getPlanEntitlements } from './entitlements';

describe('billing entitlements', () => {
  it('keeps Essential as a constrained entry plan', () => {
    const entitlements = getPlanEntitlements('essential');

    expect(entitlements.maxDocuments).toBe(10);
    expect(entitlements.maxUsers).toBe(1);
    expect(entitlements.maxFiscalCountries).toBe(1);
    expect(entitlements.aiCalendar).toBe('basic');
    expect(entitlements.aiNews).toBe('basic');
    expect(entitlements.riskMatrix).toBe('simple');
    expect(entitlements.auditLog).toBe(false);
    expect(entitlements.employeeInvites).toBe(false);
    expect(entitlements.approvalWorkflows).toBe(false);
    expect(entitlements.executiveReports).toBe(false);
    expect(entitlements.csvExports).toBe(false);
    expect(entitlements.gdprSelfService).toBe(false);
  });

  it('unlocks operational compliance for Professional', () => {
    const entitlements = getPlanEntitlements('professional');

    expect(entitlements.maxDocuments).toBe(100);
    expect(entitlements.maxUsers).toBe(3);
    expect(entitlements.maxFiscalCountries).toBe(2);
    expect(entitlements.aiCalendar).toBe('advanced');
    expect(entitlements.aiNews).toBe('standard');
    expect(entitlements.riskMatrix).toBe('complete');
    expect(entitlements.auditLog).toBe(true);
    expect(entitlements.csvExports).toBe(true);
    expect(entitlements.gdprSelfService).toBe(true);
    expect(entitlements.employeeInvites).toBe(false);
    expect(entitlements.approvalWorkflows).toBe(false);
  });

  it('unlocks team workflows and executive reporting for Business', () => {
    const entitlements = getPlanEntitlements('business');

    expect(entitlements.maxDocuments).toBe(500);
    expect(entitlements.maxUsers).toBe(10);
    expect(entitlements.maxFiscalCountries).toBe(5);
    expect(entitlements.employeeInvites).toBe(true);
    expect(entitlements.approvalWorkflows).toBe(true);
    expect(entitlements.executiveReports).toBe(true);
    expect(entitlements.whiteLabelReports).toBe(false);
  });

  it('keeps Enterprise unlimited and premium', () => {
    const entitlements = getPlanEntitlements('enterprise');

    expect(entitlements.maxDocuments).toBe(Number.POSITIVE_INFINITY);
    expect(entitlements.maxUsers).toBe(Number.POSITIVE_INFINITY);
    expect(entitlements.maxFiscalCountries).toBe(Number.POSITIVE_INFINITY);
    expect(entitlements.employeeInvites).toBe(true);
    expect(entitlements.approvalWorkflows).toBe(true);
    expect(entitlements.executiveReports).toBe(true);
    expect(entitlements.whiteLabelReports).toBe(true);
    expect(formatLimit(entitlements.maxDocuments)).toBe('unlimited');
  });
});
