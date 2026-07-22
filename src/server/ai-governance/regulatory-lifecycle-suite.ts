import {
  decideAnnexIvDocumentation,
  type AnnexIvSection,
} from './annex-iv-technical-documentation';
import {
  decideConformityLifecycle,
  type ConformityInput,
} from './conformity-assessment';
import {
  decideGpaiCompliance,
  type GpaiComplianceInput,
} from './gpai-compliance';
import { decideQualityManagementSystem, type QmsInput } from './quality-management-system';

export type RegulatoryLifecycleInput = {
  annexIv: AnnexIvSection[];
  qms: QmsInput;
  conformity: ConformityInput;
  gpai: GpaiComplianceInput;
};

export function evaluateRegulatoryLifecycleSuite(input: RegulatoryLifecycleInput) {
  const annexIv = decideAnnexIvDocumentation(input.annexIv);
  const qms = decideQualityManagementSystem(input.qms);
  const conformity = decideConformityLifecycle(input.conformity);
  const gpai = decideGpaiCompliance(input.gpai);
  const blockers = [
    ...annexIv.blockers.map((item: string) => `annex_iv:${item}`),
    ...qms.blockingControlIds.map((item: string) => `qms:${item}`),
    ...conformity.blockers.map((item: string) => `conformity:${item}`),
    ...gpai.blockers.map((item: string) => `gpai:${item}`),
  ];

  const gpaiComplete = gpai.status === 'ready_for_review' || gpai.status === 'not_applicable';

  return {
    annexIv,
    qms,
    conformity,
    gpai,
    complete:
      annexIv.status === 'approved' &&
      qms.stage === 'approved' &&
      conformity.marketPlacementReady &&
      gpaiComplete,
    blockers,
    evidenceBoundary:
      'Lifecycle readiness only. Legal applicability, conformity and market authorization remain external accountable decisions.',
  };
}
