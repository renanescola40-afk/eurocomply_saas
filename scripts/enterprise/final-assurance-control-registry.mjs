export const FINAL_ASSURANCE_ITEMS = Object.freeze({
  'external-security-review': Object.freeze({
    controlsVerified: Object.freeze(['SEC-10']),
    maximumAgeDays: 365,
    requiredChecks: Object.freeze(['scopeReviewed','criticalFindingsClosed','highFindingsClosed','remediationVerified']),
  }),
  'release-approval': Object.freeze({
    controlsVerified: Object.freeze(['REL-09']),
    maximumAgeDays: 30,
    requiredChecks: Object.freeze(['changeScopeReviewed','rollbackReviewed','goNoGoApproved']),
  }),
  'legal-documents-review': Object.freeze({
    controlsVerified: Object.freeze(['TRU-04','TRU-05','TRU-06']),
    maximumAgeDays: 365,
    requiredChecks: Object.freeze(['privacyReviewed','termsReviewed','dpaReviewed']),
  }),
  'edge-protection-review': Object.freeze({
    controlsVerified: Object.freeze(['TRU-09']),
    maximumAgeDays: 180,
    requiredChecks: Object.freeze(['wafEnabled','cdnEnabled','ddosProtectionEnabled','productionHostnameCovered']),
  }),
});
export const FINAL_ASSURANCE_CONTROL_IDS = Object.freeze([
  ...new Set(Object.values(FINAL_ASSURANCE_ITEMS).flatMap((item) => item.controlsVerified)),
]);
