export function shouldAcceptProtectedRollback({
  directHealthOk,
  authBoundaryObserved,
  providerBoundExactSha,
  targetValidationProof,
}) {
  if (directHealthOk === true) return true;
  return authBoundaryObserved === true
    && providerBoundExactSha === true
    && targetValidationProof === true;
}
