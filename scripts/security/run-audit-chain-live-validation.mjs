#!/usr/bin/env node

// Compatibility entrypoint. The bounded V2 proof is the single canonical
// implementation for target audit-chain runtime validation. Keeping this
// legacy command as a thin delegate prevents the retired 128-attempt retry
// loop from being reintroduced through npm scripts or operator runbooks.
import './run-audit-chain-live-validation-v2.mjs';
