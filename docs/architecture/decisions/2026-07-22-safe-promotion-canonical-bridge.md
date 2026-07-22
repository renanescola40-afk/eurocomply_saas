# ADR — Safe promotion canonical scorecard bridge

Date: 2026-07-22
Status: proposed

## Context

The safe runtime bootstrap can now promote valid exact-SHA evidence incrementally. Its promotion report and closeout are retained inside the bootstrap artifact, but the regular Enterprise Readiness Scorecard does not consume that artifact. As a result, valid promoted controls can exist without a canonical promoted scorecard artifact that downstream closeout automation can inspect.

## Decision

Add a dedicated read-only workflow named `Enterprise Safe Promotion Scorecard`.

The workflow runs only after a successful `Enterprise Safe Runtime Bootstrap` on `main`, or through explicit manual dispatch. It:

1. validates that the assessed SHA is the current `main` SHA;
2. downloads only the SHA-scoped bootstrap artifact from the exact source run;
3. validates the baseline, promotion report and closeout as one coherent bundle;
4. rejects wrong repository, wrong SHA, wrong run, rejected evidence, downgrades and unknown controls;
5. rejects any safe promotion of Recovery, independent Assurance or `REL-10`;
6. rejects any safe bundle that claims `GO` or 100%;
7. produces the canonical 100-control scorecard schema with monotonic promoted PASS controls;
8. publishes a retained `enterprise-readiness-promoted-scorecard-<sha>` artifact.

## Security boundaries

- Workflow permissions remain `actions: read` and `contents: read`.
- Checkout credentials are not persisted.
- The exact current `main` SHA is verified before checkout and processing.
- The artifact name contains the assessed SHA and the download is bound to the source workflow run ID.
- Promotion must contain zero rejected evidence.
- Existing PASS controls cannot be downgraded.
- Newly promoted controls require retained accepted evidence.
- Safe promotion cannot produce `GO`, cannot reach 100%, and cannot promote `REC-01`, `SEC-10` or `REL-10`.

## Consequences

The official promoted percentage can now be derived from one retained canonical artifact after each safe bootstrap. Blocked lanes remain visible and the score stays `NO_GO` until Recovery, independent Assurance and final coherence are completed through the protected full closeout.

## Rollback

Remove the bridge workflow, builder, tests and this ADR. Safe promotion artifacts remain available, but no canonical promoted scorecard will be emitted from them.
