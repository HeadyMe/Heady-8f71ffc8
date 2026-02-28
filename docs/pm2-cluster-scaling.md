# PM2 Cluster Scaling + Zero-Downtime Reload

## What changed

- `heady-manager` runs in `cluster` mode with CPU-based worker count (`HEADY_MANAGER_INSTANCES` defaults to `max`).
- Heap, connection limits, and server keepalive/timeouts are externally tunable through environment variables.
- Cluster state defaults to Redis (`CLUSTER_STATE_BACKEND=redis`) so cross-worker session/rate-limit state can be shared.
- PM2 deploy uses `pm2 startOrReload ...` and `pm2 reload ...` for zero-downtime rollouts.

## Tunables

| Variable | Purpose | Default |
|---|---|---|
| `HEADY_MANAGER_HEAP_MB` | Node old-space heap limit passed to `--max-old-space-size` | `768` |
| `HTTP_MAX_CONNECTIONS` | Max concurrent accepted TCP connections | `2000` |
| `HTTP_KEEP_ALIVE_TIMEOUT_MS` | Keepalive timeout for persistent HTTP connections | `65000` |
| `HTTP_HEADERS_TIMEOUT_MS` | Max time to receive request headers | `70000` |
| `HTTP_REQUEST_TIMEOUT_MS` | Max duration per request | `30000` |

## Load-test-guided tuning flow

1. Start the service with PM2 in production mode.
2. Run:

```bash
node scripts/ops/load-test-tuning.js
```

3. Capture the emitted `recommendedEnv` values.
4. Apply tuned values in deployment environment and `pm2 reload ecosystem.config.cjs --update-env`.
5. Re-run the load test and verify `failPct` remains low and p95/p99 are acceptable.

## Horizontal scale verification

Run:

```bash
node scripts/ops/verify-horizontal-scale.js
```

It verifies cluster mode, CPU/max instances, Redis default backend, and that `REDIS_URL` is set.

## Zero-downtime deployment command

PM2 deploy `post-deploy` now runs:

```bash
npm ci --omit=dev && pm2 startOrReload ecosystem.config.cjs --only heady-manager --update-env && pm2 reload ecosystem.config.cjs --update-env
```

This ensures new workers boot before old workers are drained.
