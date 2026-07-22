import { evaluateAnnexIvPackage, type AnnexIvRecord } from './annex-iv-technical-documentation';
import { evaluateConformityAssessment, type ConformityRecord } from './conformity-assessment';
import { evaluateGpaiCompliance, type GpaiProfile, type GpaiRecord } from './gpai-compliance';
import { decideQualityManagementSystem, type QmsInput } from './quality-management-system';

export type RegulatoryLifecycleInput = {
  annexIv: AnnexIvRecord[];
  qms: QmsInput;
  conformity: ConformityRecord[];
  gpaiProfile: GpaiProfile;
  gpai: GpaiRecord[];
};

export function evaluateRegulatoryLifecycleSuite(input: RegulatoryLifecycleInput) {
  const annexIv = evaluateAnnexIvPackage(input.annexIv);
  const qms = decideQualityManagementSystem(input.qms);
  const conformity = evaluateConformityAssessment(input.conformity);
  const gpai = evaluateGpaiCompliance(input.gpaiProfile, input.gpai);
  const blockers = [
    ...annexIv.missing.map((item) => `annex_iv:${item}`),
    ...qms.blockingControlIds.map((item) => `qms:${item}`),
    ...conformity.blockers.map((item) => `conformity:${item}`),
    ...gpai.blockers.map((item) => `gpai:${item}`),
  ];
  return {
    annexIv,
    qms,
    conformity,
    gpai,
    complete: annexIv.complete && qms.stage === 'approved' && conformity.complete && gpai.complete,
    blockers,
    evidenceBoundary: 'Lifecycle readiness only. Legal applicability, conformity and market authorization remain external accountable decisions.',
  };
}
