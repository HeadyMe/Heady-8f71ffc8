#!/usr/bin/env node
/*
 * PM2 cluster tuning helper.
 * Runs a lightweight HTTP load test and emits recommended env values.
 */
const http = require('http');
const { performance } = require('perf_hooks');

const host = process.env.LOAD_TEST_HOST || '127.0.0.1';
const port = Number(process.env.LOAD_TEST_PORT || 3301);
const path = process.env.LOAD_TEST_PATH || '/api/health';
const durationMs = Number(process.env.LOAD_TEST_DURATION_MS || 15000);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 60);
const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS || 5000);

let stop = false;
let total = 0;
let ok = 0;
let fail = 0;
const latencies = [];

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function oneRequest() {
  return new Promise((resolve) => {
    const start = performance.now();
    const req = http.get({ host, port, path, timeout: timeoutMs }, (res) => {
      res.resume();
      res.on('end', () => {
        total += 1;
        if (res.statusCode >= 200 && res.statusCode < 500) ok += 1;
        else fail += 1;
        latencies.push(performance.now() - start);
        resolve();
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });

    req.on('error', () => {
      total += 1;
      fail += 1;
      latencies.push(performance.now() - start);
      resolve();
    });
  });
}

async function worker() {
  while (!stop) {
    await oneRequest();
  }
}

(async () => {
  const workers = Array.from({ length: concurrency }, () => worker());
  await new Promise((r) => setTimeout(r, durationMs));
  stop = true;
  await Promise.all(workers);

  const rps = total / (durationMs / 1000);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const failPct = total ? (fail / total) * 100 : 100;

  const heapMb = Math.max(512, Math.ceil((concurrency * 8) / 64) * 64 + 512);
  const maxConnections = Math.max(1000, concurrency * 30);
  const keepAliveMs = p95 > 250 ? 20000 : 65000;
  const requestTimeoutMs = Math.max(10000, Math.ceil(p99 * 5));
  const headersTimeoutMs = requestTimeoutMs + 5000;

  const summary = {
    target: `http://${host}:${port}${path}`,
    durationMs,
    concurrency,
    total,
    ok,
    fail,
    failPct: Number(failPct.toFixed(2)),
    rps: Number(rps.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    p99Ms: Number(p99.toFixed(2)),
    recommendedEnv: {
      HEADY_MANAGER_HEAP_MB: heapMb,
      HTTP_MAX_CONNECTIONS: maxConnections,
      HTTP_KEEP_ALIVE_TIMEOUT_MS: keepAliveMs,
      HTTP_REQUEST_TIMEOUT_MS: requestTimeoutMs,
      HTTP_HEADERS_TIMEOUT_MS: headersTimeoutMs,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failPct > 3) process.exitCode = 2;
})();
