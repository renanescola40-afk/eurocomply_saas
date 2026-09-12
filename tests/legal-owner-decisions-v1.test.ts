import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const OWNER_DECISIONS = new URL('../docs/legal-assurance/OWNER_LEGAL_DECISIONS_V1_2026-09-12.md', import.meta.url);

describe('owner Legal Package V1', () => {
  it('records all 12 owner-approved contract and DPA positions without promoting legal acceptance', async () => {
    const source = await readFile(OWNER_DECISIONS, 'utf8');

    expect(source).toContain('Owner approval phrase: `APROVO O PACOTE LEGAL V1`');
    expect(source).toContain('OWNER_LEGAL_PACKAGE_V1=APPROVED');
    expect(source).toContain('OWNER_LEGAL_DECISIONS_12_OF_12=CLOSED_OWNER_ATTRIBUTABLE');
    expect(source).toContain('OWNER_DECISION_GAPS_FOR_TERMS_DPA=0');

    expect(source).toContain('RENEWAL_OWNER_POSITION=AUTO_RENEW_UNTIL_CANCELLED');
    expect(source).toContain('MATERIAL_PRICE_CHANGE_NOTICE_TARGET=30_DAYS_BEFORE_AFFECTED_RENEWAL');
    expect(source).toContain('PAYMENT_FAILURE_CURE_TARGET=7_DAYS_AFTER_NOTICE');
    expect(source).toContain('MATERIAL_BREACH_CURE_TARGET=30_DAYS_IF_CURABLE');
    expect(source).toContain('DEFAULT_UPTIME_SLA=NONE');
    expect(source).toContain('STANDARD_SELF_SERVICE_BROAD_INDEMNITY=NO');
    expect(source).toContain('PROPOSED_STANDARD_LIABILITY_CAP=12_MONTH_FEES_FOR_AFFECTED_SERVICE');
    expect(source).toContain('STANDARD_FORUM_OWNER_POSITION=LISBON_PORTUGAL_COURTS');
    expect(source).toContain('CONTRACTUAL_EMAIL_NOTICE_CHANNEL=comercial@risckcomply.com');
    expect(source).toContain('CUSTOMER_CONTENT_MODEL_TRAINING_WITHOUT_SPECIFIC_AUTHORITY=NO');
    expect(source).toContain('NEW_MATERIAL_SUBPROCESSOR_NOTICE_TARGET=30_DAYS');
    expect(source).toContain('ROUTINE_AUDIT_FREQUENCY_TARGET=ONCE_PER_12_MONTHS');
    expect(source).toContain('STANDARD_CUSTOMER_BREACH_NOTICE=WITHOUT_UNDUE_DELAY');

    expect(source).toContain('QUALIFIED_LEGAL_OPINION=NOT_CREATED');
    expect(source).toContain('FINAL_LEGAL_PUBLICATION=BLOCKED');
    expect(source).toContain('AUTHORITATIVE_REGISTRY_EVIDENCE=OPEN');
    expect(source).toContain('VAT_REGIME=OPEN');
    expect(source).toContain('VAT_REGISTRATIONS=OPEN');
    expect(source).toContain('CAE_CHANGE_AUTHORIZED_NOW=false');
  });

  it('preserves the already selected operator/seller and deferred CAE facts', async () => {
    const source = await readFile(OWNER_DECISIONS, 'utf8');

    expect(source).toContain('RISCK_COMPLY_OPERATOR_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED');
    expect(source).toContain('RISCK_COMPLY_CONTRACTING_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED');
    expect(source).toContain('RISCK_COMPLY_SELLER_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED');
    expect(source).toContain('SOFTWARE_SAAS_CAE_ACTION=DEFERRED_BY_OWNER_UNTIL_FINAL_ADMINISTRATIVE_PHASE');
  });
});
