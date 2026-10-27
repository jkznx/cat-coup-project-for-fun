# CI/CD implementation checklist

Status updated 2026-10-27: production packaging, workflows, drain controls and deployment tools are implemented. CI run 40344812125 passed on the public `jkznx/cat-coup-project-for-fun` repository. Temporary-port container and browser checks passed. The user confirmed private tunnel-token rotation/service update and authorized migration after tests. Live Docker migration, promotion, rollback drill and scheduled activation remain unverified. Performance loop 1 and its evidence are in `PERF.md`.

## Task 1: Run a production container

Add an emitted server build and multi-stage Docker image, with pinned Node/pnpm and non-root runtime.

Acceptance:
- [x] Frozen install, frontend/server build and all existing tests pass.
- [x] Runtime uses emitted JavaScript and production dependencies, without requiring `tsx`.
- [x] Two isolated clients create/join/ready/start through the image; hidden hands remain private.

Verification: `pnpm test`, `pnpm build`, the new server build command, `docker build`, `/health`, two-client container test.

Dependencies: none. Likely files: Dockerfile, .dockerignore, package.json, pnpm-lock.yaml, server build config. Scope: medium.

## Task 2: Connect the local Compose stack to Cloudflare

Add the app Compose service and document the route through the existing Cloudflared Windows service. Keep the connector stable across app updates.

Acceptance:
- [ ] App maps only `127.0.0.1:3001:3001`; Windows tunnel route uses `http://127.0.0.1:3001`.
- [x] User confirmed the disclosed connector token was rotated and the Windows service updated privately; no replacement secret was supplied to the assistant.
- [ ] Real hostname serves HTTPS plus Socket.IO WebSocket and HTTP fallback to two clients.

Verification: `docker compose config` without disclosing secrets, local/public health, browser network transport checks, connector restart/reconnect test.

Dependencies: task 1; domain/hostname and private token setup for the live portion. Likely files: compose.yaml, .env.example (non-secret placeholders), .gitignore, deployment guide. Scope: medium.

### Checkpoint A
- [ ] Container game works locally and through the named tunnel.
- [ ] Host availability and startup assumptions are recorded.

## Task 3: Test and publish images in GitHub Actions

Draft hosted PR checks and trusted-main image publication; adapt browser checks for Linux CI.

Acceptance:
- [ ] PR checks cover tests, types, build and two-client container smoke; deliberate failures stop publication.
- [ ] Trusted main builds publish SHA-labelled images and capture immutable digests in GHCR.
- [ ] Minimal job permissions, pinned Actions and no deployment secrets in PR jobs.

Verification: one passing and one deliberately failing branch run, inspect resulting image digest and run that exact image.

Dependencies: task 1; repository and visibility supplied. Likely files: .github/workflows/ci.yml, .github/workflows/publish.yml, tests/browser-check.mjs, package.json, lockfile. Scope: medium.

## Task 4: Protect live games during deployment

Add drain controls, count-only deployment status and build-version reporting.

Acceptance:
- [x] Separate authenticated admin listener and public-route isolation pass local tests; Compose restricts the published admin port to loopback.
- [x] Drain stops new rooms/game starts while allowing current games and seat reconnection.
- [ ] Unfinished disconnected games block deployment; timeout safely reopens admission without restarting.

Verification: focused server tests for admin authentication/routing, drain transitions, counts, reconnects, timeout handling and version output.

Dependencies: task 1. Likely files: server/index.ts, focused deployment tests, compose.yaml, deployment guide. Scope: medium.

### Checkpoint B
- [ ] CI-tested image is runnable by digest.
- [ ] Active games cannot be restarted by an ordinary deployment.

## Task 5: Deploy and roll back one exact digest

Create a locally maintained PowerShell deployment command with serialized execution and previous-version recording.

Acceptance:
- [ ] Validated allowlisted digest is pulled; only the app service is replaced after draining.
- [ ] Health, version and smoke checks determine success, with bounded logs and timeouts.
- [ ] An intentionally unhealthy candidate restores and verifies the previous digest; logs state that room recovery is unavailable.

Verification: maintenance-window good deployment, active-game postponement, invalid digest refusal and bad-image rollback drill.

Dependencies: tasks 2, 3, 4. Likely files: scripts/deploy.ps1, deployment tests, compose.yaml, deployment guide. Scope: medium.

## Task 6: Promote releases and enable Windows pull-based CD

Add explicit promotion of a tested digest and a local scheduled release watcher. Never execute downloaded release scripts.

Acceptance:
- [ ] Promotion validates trusted commit/CI result and writes a versioned deployment manifest only after successful image publication.
- [ ] Watcher accepts only the configured repository/image, rejects malformed manifests, skips repeated releases and serializes updates.
- [ ] Task Scheduler runs under the agreed Windows session after Docker readiness; stop/disable procedures and secret storage are documented.

Verification: release-promotion workflow, malformed manifest/repeated release tests, end-to-end update through hostname, recovery when Docker is stopped and restarted.

Dependencies: task 5; GitHub/host credentials and user startup arrangement. Likely files: .github/workflows/promote.yml, scripts/watch-release.ps1, scripts/register-deploy-task.ps1, deployment tests, deployment guide. Scope: medium.

### Checkpoint C: Delivery
- [ ] Two external clients complete the room smoke scenario over HTTPS/WSS.
- [ ] Active-game protection and rollback drills pass.
- [ ] User has the hostname, exact running version, operating guide and task-disable procedure.
- [ ] No token is tracked, included in an image or printed in workflow output.
