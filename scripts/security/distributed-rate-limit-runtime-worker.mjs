#!/usr/bin/env node

import { createHash } from 'node:crypto';

const REDIS_PREFIX = 'eurocomply:rate-limit:';

function fail(code) {
  process.stdout.write(`${JSON.stringify({ ok: false, code })}\n`);
  process.exit(1);
}

function readInput() {
  try {
    const parsed = JSON.parse(process.env.RATE_LIMIT_PROBE_INPUT || '');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('invalid_probe_input');
    return parsed;
  } catch {
    fail('invalid_probe_input');
  }
}

function readPipelineResult(item) {
  if (!item) return undefined;
  if (Array.isArray(item)) return item[1];
  if (item.error) return undefined;
  return item.result;
}

function redisKeyFor(key) {
  return `${REDIS_PREFIX}${String(key).replace(/[^a-zA-Z0-9:_@.-]/g, '_')}`;
}

async function deleteProbeKey(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) fail('redis_not_configured');

  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([['DEL', redisKeyFor(key)]]),
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) fail('redis_cleanup_request_failed');
  const payload = await response.json();
  const deleted = Number(readPipelineResult(payload?.[0]));
  if (!Number.isFinite(deleted) || deleted < 0) fail('redis_cleanup_result_invalid');
  return deleted;
}

async function main() {
  const input = readInput();
  const operation = process.env.RATE_LIMIT_PROBE_OPERATION || 'check';
  const rateLimitModule = await import('../../src/server/security/rate-limit.ts');

  if (operation === 'cleanup') {
    const subject = {
      userId: input.userId ?? null,
      organizationId: input.organizationId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      action: input.action ?? 'unknown',
      route: input.route ?? 'unknown',
    };
    const key = rateLimitModule.buildRateLimitKey(input.policy, subject);
    const deleted = await deleteProbeKey(key);
    process.stdout.write(`${JSON.stringify({ ok: true, operation: 'cleanup', deleted })}\n`);
    return;
  }

  const result = await rateLimitModule.checkDistributedRateLimit(input);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    operation: 'check',
    allowed: result.allowed,
    limit: result.limit,
    remaining: result.remaining,
    retryAfterSeconds: result.retryAfterSeconds,
    category: result.category,
    policy: result.policy,
    highRisk: result.highRisk,
    failureMode: result.failureMode,
    audit: result.audit,
    reason: result.reason ?? null,
    keyHash: createHash('sha256').update(result.key).digest('hex'),
  })}\n`);
}

main().catch(() => fail('worker_execution_failed'));
