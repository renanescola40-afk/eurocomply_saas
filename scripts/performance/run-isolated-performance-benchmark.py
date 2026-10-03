#!/usr/bin/env python3
import asyncio
import json
import math
import ipaddress
import os
import random
import statistics
import time
from pathlib import Path
from urllib.parse import urlparse

import asyncpg
import psycopg


def pct(values, p):
    if not values:
        return None
    xs = sorted(values)
    k = (len(xs) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return xs[int(k)]
    return xs[f] * (c - k) + xs[c] * (k - f)


def summarize(values):
    return {
        "samples": len(values),
        "p50_ms": round(pct(values, 0.50), 3) if values else None,
        "p95_ms": round(pct(values, 0.95), 3) if values else None,
        "p99_ms": round(pct(values, 0.99), 3) if values else None,
        "mean_ms": round(statistics.fmean(values), 3) if values else None,
        "max_ms": round(max(values), 3) if values else None,
    }


def timed_query(conn, parent_id, samples):
    values = []
    for _ in range(samples):
        target = random.randint(1, 5000)
        started = time.perf_counter()
        conn.execute(
            "select id, created_at from perf_bench.child_events where parent_id=%s order by created_at desc limit 50",
            (target,),
        ).fetchall()
        values.append((time.perf_counter() - started) * 1000)
    return summarize(values)


def explain(conn, parent_id):
    row = conn.execute(
        "explain (analyze, buffers, format json) select id, created_at from perf_bench.child_events where parent_id=%s order by created_at desc limit 50",
        (parent_id,),
    ).fetchone()
    plan = row[0][0]
    return {
        "planning_ms": round(plan.get("Planning Time", 0), 3),
        "execution_ms": round(plan.get("Execution Time", 0), 3),
        "plan": plan.get("Plan", {}),
    }


def seed_and_index_benchmark(dsn):
    with psycopg.connect(dsn, autocommit=True) as conn:
        conn.execute("drop schema if exists perf_bench cascade")
        conn.execute("create schema perf_bench")
        conn.execute("create table perf_bench.parent_entities(id integer primary key, name text not null)")
        conn.execute("create table perf_bench.child_events(id bigserial primary key, parent_id integer not null references perf_bench.parent_entities(id), payload text not null, created_at timestamptz not null default now())")
        conn.execute("insert into perf_bench.parent_entities(id,name) select g, 'parent-'||g from generate_series(1,5000) g")
        conn.execute("insert into perf_bench.child_events(parent_id,payload,created_at) select ((g-1)%5000)+1, repeat(md5(g::text),2), now() - (g % 86400) * interval '1 second' from generate_series(1,500000) g")
        conn.execute("analyze perf_bench.child_events")

        max_connections = int(conn.execute("show max_connections").fetchone()[0])
        before_explain = explain(conn, 2500)
        before_latency = timed_query(conn, 2500, 40)

        conn.execute("create index child_events_parent_created_idx on perf_bench.child_events(parent_id, created_at desc)")
        conn.execute("analyze perf_bench.child_events")
        after_explain = explain(conn, 2500)
        after_latency = timed_query(conn, 2500, 120)

        conn.execute("create table perf_bench.write_noidx(id bigserial primary key, parent_id integer not null, payload text not null)")
        conn.execute("create table perf_bench.write_idx(id bigserial primary key, parent_id integer not null, payload text not null)")
        conn.execute("create index write_idx_parent_idx on perf_bench.write_idx(parent_id)")
        t0 = time.perf_counter()
        conn.execute("insert into perf_bench.write_noidx(parent_id,payload) select ((g-1)%5000)+1, md5(g::text) from generate_series(1,50000) g")
        noidx_ms = (time.perf_counter()-t0)*1000
        t0 = time.perf_counter()
        conn.execute("insert into perf_bench.write_idx(parent_id,payload) select ((g-1)%5000)+1, md5(g::text) from generate_series(1,50000) g")
        idx_ms = (time.perf_counter()-t0)*1000

        return {
            "synthetic_rows": 500000,
            "parent_cardinality": 5000,
            "max_connections": max_connections,
            "before_index": {"explain": before_explain, "latency": before_latency},
            "after_index": {"explain": after_explain, "latency": after_latency},
            "write_overhead": {
                "rows_each": 50000,
                "no_index_ms": round(noidx_ms, 3),
                "with_index_ms": round(idx_ms, 3),
                "overhead_pct": round(((idx_ms / noidx_ms) - 1) * 100, 2) if noidx_ms else None,
            },
        }


async def pooled_stage(pool, concurrency):
    latencies = []
    errors = []
    start_gate = asyncio.Event()

    async def one(i):
        await start_gate.wait()
        target = (i % 5000) + 1
        started = time.perf_counter()
        try:
            async with pool.acquire() as conn:
                await conn.fetchval("select count(*) from perf_bench.child_events where parent_id=$1", target)
            latencies.append((time.perf_counter() - started) * 1000)
        except Exception as exc:
            errors.append(type(exc).__name__ + ":" + str(exc)[:160])

    tasks = [asyncio.create_task(one(i)) for i in range(concurrency)]
    wall_started = time.perf_counter()
    start_gate.set()
    await asyncio.gather(*tasks)
    wall = time.perf_counter() - wall_started
    return {
        "concurrency": concurrency,
        "requests": concurrency,
        "errors": len(errors),
        "error_rate_pct": round((len(errors) / concurrency) * 100, 3),
        "throughput_rps": round((concurrency - len(errors)) / wall, 2) if wall else None,
        "wall_ms": round(wall * 1000, 3),
        **summarize(latencies),
        "sample_errors": errors[:5],
    }


async def pooled_load(dsn, max_connections):
    pool_max = max(4, min(20, max_connections - 10))
    pool = await asyncpg.create_pool(dsn=dsn, min_size=min(4, pool_max), max_size=pool_max, command_timeout=15)
    try:
        stages = []
        for n in [10, 25, 50, 100, 250, 500, 1000]:
            stages.append(await pooled_stage(pool, n))
        return {"pool_max": pool_max, "stages": stages}
    finally:
        await pool.close()


def is_loopback_dsn(dsn):
    try:
        parsed = urlparse(dsn)
    except ValueError:
        return False
    host = parsed.hostname
    if not host:
        return False
    if host.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def main():
    dsn = os.environ.get("BENCH_DB_URL") or os.environ.get("RECOVERY_DB_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("BENCH_DB_URL/RECOVERY_DB_URL/DATABASE_URL is required")
    if not is_loopback_dsn(dsn):
        raise SystemExit("Refusing benchmark: parsed database hostname is not loopback/disposable")

    evidence_path = Path(os.environ.get("PERFORMANCE_BENCHMARK_EVIDENCE", "/tmp/performance-benchmark.json"))
    evidence_path.parent.mkdir(parents=True, exist_ok=True)

    result = {
        "schema": "risck-comply.performance-isolated-benchmark.v1",
        "subject_sha": os.environ.get("GITHUB_SHA"),
        "production_targeted": False,
        "database_url_loopback_only": True,
    }
    index_result = seed_and_index_benchmark(dsn)
    result["index_benchmark"] = index_result
    result["pooled_load"] = asyncio.run(pooled_load(dsn, index_result["max_connections"]))

    before = index_result["before_index"]["latency"]["p95_ms"]
    after = index_result["after_index"]["latency"]["p95_ms"]
    result["index_p95_improvement_pct"] = round((1 - (after / before)) * 100, 2) if before else None
    result["load_all_stages_zero_error"] = all(x["errors"] == 0 for x in result["pooled_load"]["stages"])

    evidence_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
