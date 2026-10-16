#!/usr/bin/env bash
# Zero-cost, fail-closed local equivalent of the core repository CI checks.
# Does not call GitHub Actions, Vercel, Supabase, Stripe, or production endpoints.
set -Eeuo pipefail

cd "$(dirname "$0")/../.."

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "FAIL: Node.js 22 and npm 10 are required." >&2
  exit 2
fi
node -e 'const m=Number(process.versions.node.split(".")[0]);if(m!==22){console.error("FAIL: Node.js 22 required");process.exit(2)}'
npm --version | grep -Eq '^10\.' || { echo "FAIL: npm 10 required" >&2; exit 2; }

if [[ "${INSTALL_DEPS:-0}" == "1" ]]; then
  npm ci --ignore-scripts
elif [[ ! -d node_modules ]]; then
  echo "FAIL: node_modules missing. Run INSTALL_DEPS=1 bash scripts/dev/run-offline-enterprise-preflight.sh" >&2
  exit 2
fi

checks=(
  "npm run security:package-lock"
  "node scripts/security/check-ci-required-checks-validation.mjs"
  "npm run lint"
  "npm run typecheck"
  "npm run test"
  "node --test scripts/security/iso-soc2-register-audit.test.mjs"
  "node scripts/security/iso-soc2-register-audit.mjs"
  "node --test scripts/security/iso-soc2-gate-progress.test.mjs"
  "node scripts/security/iso-soc2-gate-progress.mjs"
  "node --test scripts/security/iso-soc2-common-criteria-check.test.mjs"
  "node scripts/security/iso-soc2-common-criteria-check.mjs"
  "node scripts/security/run-security-ci-without-audit.mjs"
  "npm run quality:routes"
)
for check in "${checks[@]}"; do
  echo "RUN: $check"
  bash -o pipefail -c "$check" || { echo "FAIL: $check" >&2; exit 1; }
done

echo "RUN: npm run build (placeholder public Supabase settings, no provider write)"
NEXT_PUBLIC_SUPABASE_URL=https://ci-placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-placeholder-anon-key \
npm run build || { echo "FAIL: build" >&2; exit 1; }

echo "PASS: local source checks only. NOT GitHub CI, production, tenant E2E, SOC 2 certification or enterprise release attestation."
