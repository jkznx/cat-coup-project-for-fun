# Cat Coup deployment

Repository: https://github.com/jkznx/cat-coup-project-for-fun

Public route: `https://cat-coup.jukrachai-crybaby.space` → existing Windows Cloudflared service → `http://localhost:3001`. Never route the admin port through Cloudflare. Keep the connector installed as a Windows service; do not add a second connector container.

## CI and explicit promotion

`CI` runs on PRs and main pushes. It checks rules, sockets, types, both builds, the non-root runtime image, WebSocket/polling lobby smoke and a Chromium game walkthrough. A separate job can publish only after these checks pass on a main push. It uploads the exact tested image to `ghcr.io/jkznx/cat-coup-project-for-fun:sha-<commit>`, and records its immutable digest as `deployment-candidate`.

Use Actions → **Promote deployment** → Run workflow on **main**, specifying the successful CI run ID. This validates its workflow/branch/event/result and candidate metadata, then creates `deploy-<promotion-run-id>` with `deployment.json`. No promotion starts a deployment until the Windows watcher is explicitly enabled. Do not replace digest references with `latest`.

GHCR may initially make the package private even though the repository is public. Either configure package visibility deliberately or authenticate Docker privately with read-only package access. Never put credentials in a command saved to this repo, chat, workflow output, or Docker build args.

## Host preparation

Keep the checkout and Node 24.22.1 installed at stable paths. Docker Desktop's Linux engine must be running in the signed-in Windows session. The deployment task uses that session, not an elevated service account. Sleeping or signing out can make the game unavailable. Windows service startup alone does not start Docker Desktop.

Create a private operations directory **outside the checkout**, protect it with Windows ACLs for the current user and SYSTEM, and create an admin token file containing at least 32 random characters. This is a local deployment credential, not the Cloudflare token. Do not commit it. Example configuration stored in that private directory:

```json
{
  "stateDirectory": "C:/Users/ACER/cat-coup-ops/state",
  "adminTokenFile": "C:/Users/ACER/cat-coup-ops/admin-token.txt",
  "publicUrl": "https://cat-coup.jukrachai-crybaby.space"
}
```

The Compose app binds `127.0.0.1:3001` and authenticated admin `127.0.0.1:3002`. Secrets are mounted as a file. The app is non-root, read-only, drops capabilities and uses bounded logs. It starts with admission paused until verified. The secret never belongs in an environment file inside Git.

The previously disclosed Cloudflare connector credential still requires private rotation and service update. Do not paste it into this repository or chat. Token rotation and first live migration remain operator prerequisites.

## First migration

The old Node server has no deployment status endpoint. Confirm all current players have finished and arrange a maintenance window before stopping it. Do not kill the server just to free the port. Preserve its launch command for recovery. Download the promoted `deployment.json`, then:

```powershell
node scripts/deploy.mjs C:/private/deployment.json C:/private/config.json --bootstrap
```

Bootstrap refuses an existing HTTP server on port 3001. It pulls the exact digest, starts a candidate on a temporary loopback port, verifies version and both transports, then starts the Compose app in maintenance mode. It checks local and public version before reopening admission. Public DNS must work normally on this PC. If bootstrap fails after replacement, the app stays in maintenance mode and `blocked.json` requires review; there is no invented previous Docker image to restore.

## Subsequent deployment and rollback

```powershell
node scripts/deploy.mjs C:/private/deployment.json C:/private/config.json
node scripts/watch-release.mjs C:/private/config.json
```

The watcher performs one poll, validates release/CI/promotion provenance, and accepts only the configured GHCR repository by digest. The deployer uses an exclusive lock, skips old/repeated promotions, checks the running recorded image/version, drains new seats and games, and waits up to five minutes for unfinished games. Existing games and reconnects continue. On timeout it postpones deployment and reopens admission. Lobbies receive a reset warning and a 15-second grace period.

The candidate is tested before the live app changes. New Compose containers start drained; local/public health and exact version must pass before admission reopens. On failure, the previous recorded image is restored and checked, and automatic deployments stop behind `blocked.json`. If admission may have reopened, rollback first re-drains and refuses to interrupt new active games. Rollback restores software, **not rooms**.

Retain `current.json`, `pending.json`, `blocked.json` and lock files for diagnosis. After a crashed deployer, verify no deployment is running and inspect actual Docker state before manually clearing a stale lock. Never clear failure markers automatically. An intentionally unhealthy-image rollback drill is still required before treating CD as production-ready.

## Optional scheduled polling

Preview (no task creation):

```powershell
./scripts/register-deploy-task.ps1 -ConfigPath C:/private/config.json -NodePath 'C:/path/to/node.exe'
```

After successful manual deployment and rollback drills, add `-Enable` to register **Cat Coup Deploy**, every five minutes under the current signed-in user. It refuses to overwrite an existing task. It never executes downloaded release scripts. For authenticated GitHub metadata, supply `GH_TOKEN` to the task's environment using a private host credential mechanism; do not embed it in task arguments. Public API polling may hit rate limits; failures leave the app untouched.

```powershell
Disable-ScheduledTask -TaskName 'Cat Coup Deploy'
Get-ScheduledTaskInfo -TaskName 'Cat Coup Deploy'
```

After a machine/container restart, rooms are lost and Compose starts drained. Verify health/version and use the authenticated local `/resume` control only after reviewing state. Automatic boot recovery and connector-restart drills remain acceptance checks, not claimed results.

## Verification boundaries

Local tests and temporary-port container checks do not prove GitHub publication, public Docker migration, rollback or reboot behavior. Record actual run IDs/digests and each maintenance-window result in `VERIFICATION.md`. Keep `tasks/todo.md` honest about unperformed checks.

References: [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/), [GitHub image publication](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [Cloudflare token handling](https://developers.cloudflare.com/tunnel/reference/tunnel-tokens/).
