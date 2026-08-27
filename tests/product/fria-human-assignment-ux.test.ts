import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getFriaWorkflowCopy } from '@/lib/i18n/fria-workflow-copy';
import { locales } from '@/lib/i18n/routing';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const page = source('src/app/[locale]/dashboard/fria/page.tsx');
const assigneeRoute = source('src/app/api/ai-governance/fria/assignees/route.ts');

describe('FRIA human assignment UX', () => {
  it('defines complete FRIA product copy for all six supported locales', () => {
    for (const locale of locales) {
      const copy = getFriaWorkflowCopy(locale);
      expect(copy.title).toBeTruthy();
      expect(copy.reviewer).toBeTruthy();
      expect(copy.approver).toBeTruthy();
      expect(copy.legalReviewer).toBeTruthy();
      expect(copy.candidatesLoading).toBeTruthy();
      expect(copy.candidatesEmpty).toBeTruthy();
      expect(copy.candidatesError).toBeTruthy();
      expect(copy.evidenceTitle).toBeTruthy();
      expect(copy.approvalRationale).toBeTruthy();
    }
  });

  it('uses the merged tenant-safe assignee API and never asks customers for raw UUIDs', () => {
    expect(page).toContain('/api/ai-governance/fria/assignees?assessment_id=');
    expect(page).toContain('displayName: string');
    expect(page).toContain('email: string');
    expect(page).toContain('eligibleFor: AssignmentKind[]');
    expect(page).toContain('candidate.displayName');
    expect(page).toContain('candidate.email');
    expect(page).toContain("candidatesFor('reviewer')");
    expect(page).toContain("candidatesFor('approver')");
    expect(page).toContain("candidatesFor('legalReviewer')");
    expect(page).not.toContain('Reviewer UUID');
    expect(page).not.toContain('Approver UUID');
    expect(page).not.toContain('Legal reviewer UUID');
    expect(page).not.toContain('placeholder="UUID"');

    expect(assigneeRoute).toContain("permission: 'manage_ai_governance'");
    expect(assigneeRoute).toContain('listFriaAssigneeCandidates');
  });

  it('keeps read-only roles out of mutation and assignee operations', () => {
    expect(page).toContain("roleHasPermission(snapshot?.role, 'manage_ai_governance')");
    expect(page).toContain('if (!selected || !canManage)');
    expect(page).toContain('snapshot && !canManage ? <section');
    expect(page).toContain("canManage && current.stage !== 'approved'");
    expect(page).not.toContain("from '@/components/ui/card'");
  });

  it('does not auto-assert regulatory control completion when saving an assessment', () => {
    expect(page).toContain('publicAuthorityOrPublicService, highRiskSystem, vulnerableGroupsConsidered');
    expect(page).toContain('monitoringPlanComplete,');
    expect(page).toContain('dataProtectionCoordinationComplete,');
    expect(page).not.toContain('publicAuthorityOrPublicService: true');
    expect(page).not.toContain('highRiskSystem: true');
    expect(page).not.toContain('vulnerableGroupsConsidered: true');
    expect(page).not.toContain('monitoringPlanComplete: true');
    expect(page).not.toContain('dataProtectionCoordinationComplete: true');
  });

  it('preserves backend separation and fail-closed approval boundaries', () => {
    expect(page).toContain("candidate.userId !== reviewerId");
    expect(page).toContain("if (approverId && approverId === reviewerId)");
    expect(page).toContain("run('assessment_approve'");
    expect(page).toContain('approvalRationale.trim().length < 10');
    expect(page).toContain("run('evidence_submit'");
  });
});
