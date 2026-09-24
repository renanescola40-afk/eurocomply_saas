import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(rootDir, p), 'utf8');

describe('universal buyer readiness truth gate', () => {
  const universal = read('docs/trust/UNIVERSAL_BUYER_READINESS_2026-09-24.md');
  const ma = read('docs/trust/M_AND_A_IP_SOFTWARE_DILIGENCE_INDEX.md');
  const oss = read('docs/trust/OPEN_SOURCE_LICENSE_DILIGENCE_2026-09-24.md');

  it('defines all four buyer share sets and keeps sensitive source out of initial disclosure', () => {
    for (const token of ['SMB_INITIAL_PACK', 'MID_MARKET_INITIAL_PACK', 'ENTERPRISE_INITIAL_PACK', 'BIG_TECH_MA_INITIAL_PACK']) {
      expect(universal).toContain(token);
    }
    expect(universal).toContain('Do not automatically send source code');
    expect(ma).toContain('Source code is never part of the automatic initial buyer pack');
  });

  it('preserves external assurance non-claims', () => {
    expect(universal).toContain('ISO 27001: `NOT_CERTIFIED`');
    expect(universal).toContain('SOC 2: `NOT_AUDITED`');
    expect(universal).toContain('clean independent pentest/retest: `WAITING_EXTERNAL_SECURITY`');
    expect(universal).toContain('WORM storage: `NOT_HELD`');
    expect(universal).not.toMatch(/ISO 27001[^\n]*(certified|PASS)/i);
    expect(universal).not.toMatch(/SOC 2[^\n]*(certified|audited|PASS)/i);
  });

  it('does not create customer, revenue, insurance or buyer-acceptance evidence', () => {
    expect(universal).toContain('buyer acceptance/contracts: `WAITING_BUYER`');
    expect(universal).toContain('cyber/E&O insurance: `NOT_HELD_OR_NOT_EVIDENCED`');
    expect(universal).not.toMatch(/BUYER_ACCEPTANCE=PASS/);
    expect(universal).not.toMatch(/REAL_CUSTOMER_REVENUE=PASS/);
  });

  it('records M&A ownership and source-code boundaries without unsupported title claims', () => {
    expect(ma).toContain('not a legal title opinion');
    expect(ma).toContain('WAITING_SIGNATURE');
    expect(ma).toContain('UNVERIFIED_OWNERSHIP_CLAIM=0');
    expect(ma).toContain('executed NDA');
  });

  it('records lockfile license facts and flags review-sensitive LGPL instead of claiming zero risk', () => {
    expect(oss).toContain('Package entries reviewed: 940');
    expect(oss).toContain('Unknown/missing license metadata in lockfile: 0');
    expect(oss).toContain('LGPL-3.0-or-later');
    expect(oss).toContain('NO_KNOWN_LICENSE_CONFLICT=NOT_CLAIMED_WITHOUT_LEGAL_REVIEW');
  });

  it('keeps current release truth exact', () => {
    const sha = '3599ad36e8549474021a669e0f1ad427421df4b7';
    expect(universal).toContain(sha);
    expect(ma).toContain(sha);
  });
});
