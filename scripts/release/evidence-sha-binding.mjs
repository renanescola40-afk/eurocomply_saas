const FULL_SHA = /^[a-f0-9]{40}$/;

const SHA_BINDINGS = Object.freeze([
  ['targetSha', (document) => document?.targetSha],
  ['expectedSha', (document) => document?.expectedSha],
  ['observedSha', (document) => document?.observedSha],
  ['commitSha', (document) => document?.commitSha],
  ['commit_sha', (document) => document?.commit_sha],
  ['releaseSha', (document) => document?.releaseSha],
  ['release_sha', (document) => document?.release_sha],
  ['deploymentSha', (document) => document?.deploymentSha],
  ['deployment_sha', (document) => document?.deployment_sha],
  ['sourceSha', (document) => document?.sourceSha],
  ['source_sha', (document) => document?.source_sha],
  ['productSha', (document) => document?.productSha],
  ['product_sha', (document) => document?.product_sha],
  ['testBinding.productSha', (document) => document?.testBinding?.productSha],
  ['buildSha', (document) => document?.buildSha],
  ['build_sha', (document) => document?.build_sha],
  ['sha', (document) => document?.sha],
  ['provenance.commitSha', (document) => document?.provenance?.commitSha],
  ['provenance.targetSha', (document) => document?.provenance?.targetSha],
  ['provenance.headSha', (document) => document?.provenance?.headSha],
  ['reviewBinding.productSha', (document) => document?.reviewBinding?.productSha],
  ['runtimeContext.commitSha', (document) => document?.runtimeContext?.commitSha],
  ['runtimeContext.releaseSha', (document) => document?.runtimeContext?.releaseSha],
  ['runtimeContext.buildSha', (document) => document?.runtimeContext?.buildSha],
  ['githubActions.commitSha', (document) => document?.githubActions?.commitSha],
  ['githubActions.headSha', (document) => document?.githubActions?.headSha],
  ['sourceWorkflow.headSha', (document) => document?.sourceWorkflow?.headSha],
  ['verification_provenance.commitSha', (document) => document?.verification_provenance?.commitSha],
]);

export function collectEvidenceShaBindings(document) {
  return SHA_BINDINGS.flatMap(([source, getter]) => {
    const raw = getter(document);
    if (typeof raw !== 'string' || !raw.trim()) return [];
    return [{ source, value: raw.trim() }];
  });
}

export function resolveEvidenceShaBinding(document) {
  const bindings = collectEvidenceShaBindings(document);
  const primary = bindings[0]?.value ?? null;
  const validBindings = bindings.filter((binding) => FULL_SHA.test(binding.value));
  const distinctValidShas = [...new Set(validBindings.map((binding) => binding.value))];

  return {
    sha: primary,
    source: bindings[0]?.source ?? null,
    bindings,
    validBindings,
    conflict: distinctValidShas.length > 1,
    distinctValidShas,
  };
}
