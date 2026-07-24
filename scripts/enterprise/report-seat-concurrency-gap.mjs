import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const targetSha = process.env.TARGET_SHA ?? process.env.GITHUB_SHA ?? 'unknown';
const migrationPath = 'supabase/migrations/20260724103000_enterprise_seat_concurrency.sql';
const servicePath = 'src/server/enterprise/seat-capacity.ts';
const migration = readFileSync(migrationPath, 'utf8');
const service = readFileSync(servicePath, 'utf8');

const controls = {
  versionedPolicy: migration.includes('enterprise_seat_policies') && migration.includes('version bigint'),
  idempotentReservation: migration.includes('unique (organization_id, idempotency_key)'),
  serializedReservation: migration.includes('pg_advisory_xact_lock'),
  optimisticConsumption: migration.includes('expected_member_seat_version'),
  failClosedCapacity: migration.includes("'seat_limit_reached'") && migration.includes("'policy_unavailable'"),
  serviceRoleBoundary: migration.includes('grant execute on function public.reserve_enterprise_seat_atomic') && migration.includes('to service_role'),
  privacyPreservingInvite: service.includes("createHash('sha256')") && migration.includes('invite_email_hash'),
  appendOnlyEvidence: migration.includes('enterprise_seat_events') && migration.includes('force row level security'),
};

const passed = Object.values(controls).filter(Boolean).length;
const total = Object.keys(controls).length;
const report = {
  targetSha,
  generatedAt: new Date().toISOString(),
  status: passed === total ? 'TECHNICAL_CONTROLS_PRESENT' : 'TECHNICAL_GAP',
  controls,
  score: Math.round((passed / total) * 100),
  truthBoundary: {
    productionMigrationApplied: false,
    externalConcurrencyProven: false,
    billingContractSynchronized: false,
  },
  sourceDigest: createHash('sha256').update(migration).update(service).digest('hex'),
};

mkdirSync('artifacts/enterprise-seat-concurrency', { recursive: true });
writeFileSync('artifacts/enterprise-seat-concurrency/report.json', JSON.stringify(report, null, 2));
writeFileSync('artifacts/enterprise-seat-concurrency/report.md', [
  '# Enterprise Seat Concurrency',
  '',
  `- Target SHA: \`${targetSha}\``,
  `- Technical control score: **${report.score}%**`,
  `- Status: **${report.status}**`,
  '',
  ...Object.entries(controls).map(([name, ok]) => `- ${ok ? 'PASS' : 'FAIL'} — ${name}`),
  '',
  '> This report does not claim that the migration is applied in production, that external concurrency was exercised, or that billing contracts are synchronized.',
].join('\n'));

if (passed !== total) process.exitCode = 1;
