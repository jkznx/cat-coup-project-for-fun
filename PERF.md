# Performance engineering loop

Measured 2026-10-27 against a separate loopback instance on port 3105. The public game was not used for load testing. Raw measurements: [docs/performance/2026-10-27.json](docs/performance/2026-10-27.json).

## Loop 1: initial artwork delivery — kept

Hypothesis: the original PNG dominates initial resource bytes. Re-encoding the same pixels as lossless WebP should reduce download work without changing the UI, game rules or image quality.

| Metric | Baseline | Lossless WebP | Interpretation |
|---|---:|---:|---|
| Sprite bytes | 3,194,511 | 2,195,468 | 31.3% smaller; deterministic primary result |
| Median completed resource bytes | 3,620,279 | 2,621,246 | 27.6% less data in the measured page |
| Median page/artwork ready | 8,199.5 ms | 6,176.8 ms | 24.7% lower median; synthetic only |
| Page/artwork ready range | 8,137.1–8,234.8 ms | 6,055.3–8,753.7 ms | After run has a slow outlier; no universal speed claim |
| Median LCP | 2,084 ms | 2,028 ms | Within run variation; no material LCP improvement claimed |
| CLS | 0.00356 | 0.00356 | Unchanged in these runs |

Each condition used three fresh browser contexts, cache disabled, Edge at 1440×1000, 500,000 download bytes/s, 40 ms added network latency, 4× CPU slowdown and reduced motion. The measurement waits for React to render, fonts and the CSS artwork response to finish, then two animation frames. Page/artwork-ready is a custom laboratory metric, not a Core Web Vital. Images and other completed resources are included; Socket.IO requests and document bytes are excluded from resource totals.

The first instrumentation attempt sampled before the background image finished and was discarded. A connection wait also timed out once; the successful complete baseline is the one archived above. The timing spread means the byte reduction is the firm result. Field LCP/INP and real-player connection quality have not been measured.

`scripts/optimize-artwork.mjs` checks dimensions and full decoded RGBA buffers for equality. The original PNG remains available as source artwork; the browser references the WebP derivative. Provenance and hashes are in `public/assets/PROVENANCE.md`. No font subset, React memoization, game-state clone, rule or network protocol changes were bundled into this experiment.

## Regression guard

Run `pnpm build`, then `pnpm perf:budget`. CI and the Docker build enforce:

- Total built JavaScript gzip: at most 130,000 bytes (measured 112,883).
- Total built CSS gzip: at most 23,000 bytes (measured 18,666).
- The sprite actually referenced by production CSS: at most 2,250,000 bytes.

The byte check is deterministic. Browser timings remain evidence rather than a flaky CI time threshold. Existing rules, private-hand, drain and manifest tests plus desktop/mobile browser and WebSocket/polling smoke checks remain correctness gates.

## Next bounded loops

| Order | Question and baseline | Keep gate | Status |
|---|---|---|---|
| 1 | Can identical artwork use fewer bytes? | Pixels identical, bytes lower, tests green | Completed; kept |
| 2 | Are JS/CSS transfers compressed through the public edge? Inspect response encodings and cold/warm waterfalls. | Reduced transferred bytes without caching private state or stale HTML | Planned; measure first |
| 3 | Does a six-seat game have slow interactions? Capture a local CPU trace and command/ack p50/p95 with a fixed bounded workload. | Improvement exceeds repeated-run noise; privacy and rules unchanged | Planned; no public load test |
| 4 | Where does reconnect time go through the tunnel? Measure a controlled interruption on an isolated room. | Same seat restored; measured reconnect improvement | Planned; arrange a maintenance window |

For each loop: record a baseline and one hypothesis, change one thing, repeat the same workload, run correctness gates, then keep or revert. Record failed attempts too. Add a regression guard for a demonstrated gain. Avoid adding a database, Redis, multiple replicas or broad memoization without evidence; this game currently owns its rooms in one process.

Reproduction uses `scripts/performance-check.mjs <label>` with an installed Playwright module (`PLAYWRIGHT_MODULE`) and optionally `BROWSER_CHANNEL`. `BASE_URL` must be a separate localhost instance. Full laboratory screenshots and temporary records stay under ignored `.impeccable/review/`.
