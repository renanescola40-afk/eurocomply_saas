import { describe, expect, it } from 'vitest';
import {
  AI_COMPLIANCE_PRODUCT_MAP,
  buildAiGovernanceReadiness,
  localizeCapabilityRoute,
} from './readiness';
import type { AiSystemRecord } from '@/server/queries/ai-systems';
import type { AiIncidentRecord } from '@/server/queries/ai-incidents';

function makeSystem(overrides: Partial<AiSystemRecord> = {}): AiSystemRecord {
  return {
    id: 'sys_1',
    organization_id: 'org_1',
    name: 'Support Copilot',
    owner_team: 'Customer Operations',
    vendor_name: 'Model Vendor',
    use_case: 'Suggests replies to support agents.',
    role: 'deployer',
    lifecycle_status: 'production',
    risk_domain: 'customer_support',
    uses_personal_data: true,
    interacts_with_people: false,
    generates_content: true,
    biometric_identification: false,
    manipulative_or_exploitative: false,
    risk_level: 'limited_transparency',
    classification_summary: 'Limited-risk AI system with transparency obligations to review.',
    obligations: ['Review transparency notice.'],
    next_actions: ['Attach vendor documentation.'],
    created_by: 'user_1',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeIncident(overrides: Partial<AiIncidentRecord> = {}): AiIncidentRecord {
  return {
    id: 'inc_1',
    organization_id: 'org_1',
    ai_system_id: 'sys_1',
    title: 'Unexpected output',
    summary: 'A generated answer required review.',
    category: 'transparency_failure',
    severity: 'monitor',
    detected_at: '2026-06-10T10:00:00.000Z',
    report_status: 'assessing',
    authority: null,
    internal_owner: 'Compliance',
    deadline_plan: [],
    next_actions: ['Review logs.'],
    created_by: 'user_1',
    created_at: '2026-06-10T10:00:00.000Z',
    updated_at: '2026-06-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('AI Act readiness product map', () => {
  it('covers the full product scope with concrete routes', () => {
    expect(AI_COMPLIANCE_PRODUCT_MAP).toHaveLength(17);

    const ids = new Set(AI_COMPLIANCE_PRODUCT_MAP.map((capability) => capability.id));
    expect(ids).toEqual(new Set([
      'ai_systems_inventory',
      'eu_ai_act_risk_classification',
      'ai_usage_questionnaire',
      'ai_governance_dashboard',
      'document_generator_flow',
      'policy_pack_generator',
      'employee_ai_usage_policy',
      'ai_vendor_assessment',
      'ai_incident_register',
      'evidence_pack',
      'readiness_score',
      'gap_analysis',
      'action_plan',
      'export_ready_reports',
      'board_audit_summary',
      'country_aware_context',
      'role_based_workflow',
    ]));

    expect(AI_COMPLIANCE_PRODUCT_MAP.every((capability) => capability.route.startsWith('/'))).toBe(true);
    expect(AI_COMPLIANCE_PRODUCT_MAP.some((capability) => /fake|placeholder/i.test(capability.route))).toBe(false);
  });

  it('localizes capability routes without dropping hash fragments', () => {
    expect(localizeCapabilityRoute('pt', '/policy-pack#employee-ai-usage-policy')).toBe('/pt/policy-pack#employee-ai-usage-policy');
  });
});

describe('AI Act readiness scoring', () => {
  it('does not fabricate a score when inventory is empty', () => {
    const readiness = buildAiGovernanceReadiness({ locale: 'pt', systems: [], incidents: [] });

    expect(readiness.score).toBeNull();
    expect(readiness.status).toBe('not_started');
    expect(readiness.gaps[0]?.id).toBe('inventory-empty');
    expect(readiness.boardSummary).toMatch(/not yet assessable/i);
  });

  it('calculates readiness from real systems and incidents', () => {
    const readiness = buildAiGovernanceReadiness({
      locale: 'en',
      systems: [makeSystem()],
      incidents: [makeIncident()],
    });

    expect(readiness.score).toBeGreaterThanOrEqual(80);
    expect(readiness.totals.systems).toBe(1);
    expect(readiness.totals.openIncidents).toBe(1);
    expect(readiness.gaps.some((gap) => gap.id === 'transparency-review')).toBe(true);
    expect(readiness.boardSummary).toContain('1 registered AI system');
  });

  it('surfaces owner and high-risk evidence gaps', () => {
    const readiness = buildAiGovernanceReadiness({
      locale: 'de',
      systems: [
        makeSystem({
          id: 'sys_high',
          owner_team: null,
          vendor_name: null,
          risk_domain: 'employment',
          risk_level: 'high_risk_review',
        }),
      ],
      incidents: [],
    });

    expect(readiness.score).toBeLessThan(80);
    expect(readiness.gaps.map((gap) => gap.id)).toEqual(
      expect.arrayContaining(['owners-missing', 'high-risk-governance', 'incident-register-empty']),
    );
    expect(readiness.countryContext.locale).toBe('de');
  });
});
