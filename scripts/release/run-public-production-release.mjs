#!/usr/bin/env node

// Canonical wrapper for the enterprise production release runner.
// CI validates the full command contract across this file and the v2 runner.
// The env preflight fails closed and writes redacted evidence before runtime gates run.

import './check-enterprise-release-env.mjs';
import './run-public-production-release-v2.mjs';
