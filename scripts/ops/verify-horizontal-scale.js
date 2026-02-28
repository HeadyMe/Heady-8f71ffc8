#!/usr/bin/env node
/*
 * Cluster readiness verifier.
 * - Confirms PM2 is configured for cluster instances
 * - Confirms Redis backend is configured for shared state/rate limit
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'ecosystem.config.cjs');
const raw = fs.readFileSync(configPath, 'utf8');
const hasClusterMode = /name:\s*'heady-manager'[\s\S]*?exec_mode:\s*'cluster'/.test(raw);
const hasCpuInstances = /name:\s*'heady-manager'[\s\S]*?instances:\s*process\.env\.HEADY_MANAGER_INSTANCES\s*\|\|\s*'max'/.test(raw);
const hasRedisBackend = /CLUSTER_STATE_BACKEND:\s*process\.env\.CLUSTER_STATE_BACKEND\s*\|\|\s*'redis'/.test(raw);

const checks = [
  { check: 'heady-manager uses PM2 cluster mode', pass: hasClusterMode },
  { check: 'heady-manager instances scale by CPU/max', pass: hasCpuInstances },
  { check: 'cluster state backend defaults to redis', pass: hasRedisBackend },
  { check: 'REDIS_URL is set in environment', pass: !!process.env.REDIS_URL },
];

const failed = checks.filter((c) => !c.pass).length;
console.log(JSON.stringify({ checks, failed }, null, 2));
if (failed) process.exit(1);
