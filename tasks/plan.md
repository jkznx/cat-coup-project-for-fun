# Plan: Cat Coup CI/CD through Cloudflare Tunnel

Planning date: 2026-10-26 (Asia/Bangkok), updated 2026-10-27. Production packaging, CI, drain and deployment tools are implemented. Hosted CI run 40344812125 passed both verification and publication. Public HTTPS and two-client lobby/WebSocket checks previously passed against the Windows Node server. The user confirmed token rotation/service update and authorized a tested migration. Live Docker migration, rollback drills and scheduled activation remain pending. See `tasks/todo.md`, `DEPLOYMENT.md` and `PERF.md` for evidence and the performance loop.

2026-10-28: performance CI and explicit release promotion succeeded. Host deployment is paused at the user's request after the Docker engine was unavailable; no app replacement or scheduled activation occurred.

## Confirmed scope and assumptions

- Run on the user's Windows PC with Docker Desktop, using Linux containers.
- Use a stable Cloudflare Tunnel hostname for browser and Socket.IO traffic.
- Source/CI: public repository `https://github.com/jkznx/cat-coup-project-for-fun`, GitHub Actions and GHCR. The local checkout is initialized and pushed on main.
- Confirmed hostname: `https://cat-coup.jukrachai-crybaby.space`, routed through the `cat-coup` tunnel to `http://localhost:3001` on Windows.
- One Node app instance. Existing room/session state is in memory; restarting loses rooms, including during rollback. No database migration or multi-replica feature is proposed.

## Proposed architecture

```text
Pull request → GitHub-hosted CI → tests + typecheck + build + container smoke
Main commit → successful CI → GHCR image identified by immutable digest
Promote exact tested digest → deployment release + deployment.json
Windows scheduled task → checks approved release → pulls image → drains → deploys

Players → HTTPS/WSS → Cloudflare → Cloudflared Windows service
                                      │ Windows loopback
                                      └→ 127.0.0.1:3001 → app container
```

Cloudflare Tunnel carries requests to an app running on this PC; it does not host the game or run CI. The PC, Docker Desktop and connector must stay running. A sleeping PC or stopped Docker Desktop makes the game unavailable. Docker restart policies alone do not start Docker Desktop before a Windows user session.

### Runtime

Retain the installed Cloudflared Windows service and use Compose for the app. The published application route should point to `http://127.0.0.1:3001` on Windows. Map the app container with `127.0.0.1:3001:3001`. Configure `HOST=0.0.0.0`, `PORT=3001`, and `NODE_ENV=production` inside the app container. The existing app needs that HOST override because its default is loopback. The current non-container development server must release port 3001 during the planned migration; do not stop it before the container is built and verified on a temporary loopback port.

Do not publish the game port to the LAN. The loopback mapping serves the Windows connector and local checks. App updates recreate only the app service; keep the Windows connector running. Pin the app image by tested digest and record the installed cloudflared version separately. Give the app a restart policy and bounded logs, and use a non-root app user. No Docker socket is mounted into the app.

Verify the existing remotely managed tunnel and configure its published application route in Cloudflare. The installation token was disclosed in chat: rotate it, disconnect existing connections as appropriate under Cloudflare's compromised-token procedure, and reinstall the Windows service privately with the replacement. Rotation/reinstallation is pending and has not been performed by the assistant. Never record either token in this project. Keep connector credentials in protected Windows service configuration, outside build arguments, source files and GitHub CI secrets. No router port forwarding or public SSH endpoint is required.

Use the same public origin for UI, `/socket.io/` and HTTP fallback. Bypass cache for `/socket.io/*`, `/health` and HTML; hashed static assets may be cached. Verify WebSocket upgrade and fallback through the actual hostname. Reconnection is required because Cloudflare/network interruptions can close sockets even when the Node process remains alive.

### Build and CI

Add a reproducible multi-stage image build using the lockfile and a pinned, tested Node base. Pin the pnpm version too. Current `pnpm start` uses `tsx`, which is a devDependency: a production-only install cannot run it. Add a dedicated server compilation/bundle step and run the emitted Node server with production dependencies; keep the current frontend build unchanged. Test that actual runtime image, not just the builder.

For pull requests, use GitHub-hosted runners with read-only repository permissions. Run frozen install, all rules/room tests, TypeScript, frontend/server build, and a two-client container smoke check. Adapt the browser test to a configurable base URL and Linux Chromium so CI does not require Windows Edge or a developer-specific module path. Pin third-party Actions to reviewed commit SHAs at implementation time.

Only trusted main commits that pass CI may publish an image to GHCR. Use `GITHUB_TOKEN` with `packages:write` only in the image publication job. Record source commit, image digest and build result. Never deploy a moving `latest` tag. PR code cannot publish images or access deployment credentials.

### CD from the Windows host

Use a local PowerShell deployment script and Windows Task Scheduler to pull releases. This avoids running general GitHub Actions jobs on the user's personal PC and requires no inbound administration route. The scheduled task runs a locally installed script; it never downloads and executes scripts from release assets.

First support a manual deployment of an exact digest. Then add promotion of the tested digest via a `workflow_dispatch` workflow and a deployment release containing `deployment.json`. Keep promotion explicit for this in-memory game. The manifest contains schema version, source commit, exact allowlisted GHCR image digest, release identifier and CI provenance. Publish it only after the image and checks exist. The host polls this specific repository's deployment releases, rejects malformed/untrusted/out-of-order data, and skips already deployed digests. Do not treat every GitHub release or arbitrary branch as a production promotion.

The host stores only read credentials needed for private repository release metadata and GHCR image pulls, if private. Keep credentials in Windows Credential Manager or a restricted host secret store, outside the checkout. A deployment task has a mutex, timeout, bounded logs and no overlapping runs. Docker Desktop must be healthy before it attempts an update. Do not create the task or change Windows startup/sleep settings during planning.

### Active-game protection and rollback

Add a small deployment control interface on a separate admin listener; publish it to Windows loopback only and require a local deployment secret. It is not routed through the public tunnel. The public app listener must not serve admin routes.

Drain blocks room creation and new game starts while allowing existing games and reconnects to finish. Report counts only, without player data or session tokens. Count every unfinished game as active, including disconnected or abandoned games. The deployer waits for zero active games; on timeout it postpones the release and reopens admission. Never force-kill an active game automatically. Existing lobby seats are warned that the update will reset their lobby; room state is not durable.

Once drained, record the previous image digest and deploy the new one. Verify local health, reported build version and a room-flow smoke test, then verify public HTTPS and Socket.IO. If checks fail, restore the previous digest and verify again. Rollback restores software only; it cannot recover lost rooms. Capture logs and stop repeated failed deployment attempts until reviewed. No zero-downtime claim is made.

## Ordered implementation slices

| Task | Outcome | Depends on |
|---|---|---|
| 1 | Production container runs the existing game | None |
| 2 | Container routes through the existing Windows tunnel service | 1; hostname supplied and token privately rotated |
| 3 | Hosted CI checks and publishes tested immutable images | 1; GitHub repository supplied |
| 4 | Drain and version checks protect active games | 1 |
| 5 | Manual digest deployment and rollback work locally | 2, 3, 4 |
| 6 | Release promotion and Windows pull-based CD work | 5 |

Checkpoints: container + tunnel; CI + drain; end-to-end promotion + rollback. Per-task acceptance criteria and verification commands are in `todo.md`.

## Completion criteria

Two separate Internet clients can join one room via the HTTPS hostname and play through Socket.IO. A deliberately failed CI run publishes no deployment candidate. A production promotion changes the reported running digest/version. An active game prevents restart. A bad image triggers rollback to the recorded previous digest. Connector restart reconnects clients without resetting the still-running app's game. Windows/Docker restart behavior and the expected loss of in-memory rooms are documented and tested in a maintenance window.

## Inputs needed before external setup

1. GitHub repository/owner and public/private visibility. Creating or pushing a repository will be a separate concrete action.
2. Cloudflare-managed domain and desired hostname. If none exists, domain setup precedes a stable published application.
3. User rotates the disclosed connector token and updates the installed Windows service privately. Supply only completion/status, never a token.
4. Decide the Windows login/startup arrangement and availability expectations. The initial plan assumes Docker Desktop is running in the signed-in user's session.

Local packaging, tests and workflow drafts can be prepared before these inputs arrive. Tunnel credential replacement, route/DNS changes, registry publication and scheduled deployment activation are later setup actions.

## Primary references

- [Cloudflare Tunnel overview](https://developers.cloudflare.com/tunnel/): outbound connector model.
- [Tunnel setup](https://developers.cloudflare.com/tunnel/get-started/): domain/account prerequisites and published application routes.
- [Tunnel tokens](https://developers.cloudflare.com/tunnel/reference/tunnel-tokens/): connector token handling.
- [Cloudflare WebSockets](https://developers.cloudflare.com/network/websockets/): proxy support and connection interruptions.
- [GitHub image publication](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images): Actions, GHCR and publishing permissions.
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use): runner and workflow trust boundaries.
