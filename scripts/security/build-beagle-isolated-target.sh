#!/usr/bin/env bash
set -euo pipefail

export NEXT_PUBLIC_SUPABASE_URL='https://vfqxmiaaagqpbwrrroww.supabase.co'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_GucvNM1m1S875lhpoj48lA_SVi6IlYX'
export SUPABASE_URL='https://vfqxmiaaagqpbwrrroww.supabase.co'

# Fail closed: this disposable target must never inherit privileged Production credentials.
export SUPABASE_SERVICE_ROLE_KEY=''
export DATABASE_SERVICE_ROLE_KEY=''
export DATABASE_URL=''
export STRIPE_SECRET_KEY=''
export STRIPE_WEBHOOK_SECRET=''
export BEAGLE_PENTEST_TARGET='isolated-vfqxmiaaagqpbwrrroww'

exec npm run build
