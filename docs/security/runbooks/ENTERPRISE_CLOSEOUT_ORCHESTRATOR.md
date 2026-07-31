# Enterprise Closeout Orchestrator

## Purpose

Convert the exact-SHA Enterprise Final Decision into an ordered execution queue. The queue identifies what is complete, what can be executed by engineering or operations, and what requires an owner or qualified external reviewer.

## Inputs

- exact current `main` SHA;
- source Enterprise Final Decision workflow run ID;
- immutable `enterprise-final-decision.json` artifact.

The workflow refuses a stale SHA and downloads the decision artifact from the named source run.

## Output

The retained artifact contains:

- `enterprise-closeout-queue.json` for automation;
- `enterprise-closeout-queue.md` for operators;
- progress based only on completed mandatory controls;
- separate counts for execution-required and owner-action-required controls;
- required owner, action, evidence and release impact for each blocker.

## State model

- `COMPLETE`: accepted PASS/passed evidence exists for the exact SHA.
- `EXECUTION_REQUIRED`: an operational or technical validation still needs to run.
- `OWNER_ACTION_REQUIRED`: repository configuration, qualified legal review, independent security review or another external action is required.

## Truth and safety boundaries

The orchestrator does not create evidence, run production migrations, approve environments, perform legal/security review, accept risk or grant Enterprise GO. It only compiles the state already established by the final decision.

A progress value of 100% means all ten mandatory controls are represented as complete in the source decision. The queue itself still does not grant GO; the final approval process remains authoritative.

## Operating procedure

1. Run `Enterprise Final Decision` for the exact current `main` SHA.
2. Record its successful workflow run ID.
3. Dispatch `Enterprise Closeout Orchestrator` with that SHA and run ID.
4. Download the 90-day retained queue artifact.
5. Execute `EXECUTION_REQUIRED` items in priority order.
6. Assign `OWNER_ACTION_REQUIRED` items to the named owner without replacing real evidence with comments or templates.
7. Re-run the source evidence workflows and final decision after each accepted closure wave.

## Related work

This orchestrates the remaining work tracked by #1032, #1395, #198 and #778. It must not close those issues unless their own acceptance criteria are met.
