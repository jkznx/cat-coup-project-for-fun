# Verification record

Verified 2026-10-26, Asia/Bangkok.

## Update: 2026-10-27

- Hosted CI run [40344812125](https://github.com/jkznx/cat-coup-project-for-fun/actions/runs/40344812125) completed successfully: both `verify` and `publish` passed for the original deployment implementation.
- Current local suite: 13 passed, including admin isolation, startup drain, unfinished-game/reconnect handling and manifest validation.
- The production image was tested on temporary port 3101, including the desktop/mobile browser game flow and isolated WebSocket/polling smoke. Runtime user was `node`; `tsx` was absent from production dependencies.
- Lossless artwork delivery was measured on a separate instance on port 3105. Original and derivative decoded RGBA pixels match. The derivative is 31.3% smaller; full evidence and timing limitations are in `PERF.md` and `docs/performance/2026-10-27.json`.
- After the artwork change, production build, byte budgets, 13 tests, desktop/mobile walkthrough and both socket transports passed locally. Hosted CI run [40446705744](https://github.com/jkznx/cat-coup-project-for-fun/actions/runs/40446705744) subsequently passed for commit `982443f597d66b24e1545587f24f23ebbbc4e77e`, confirmed 2026-10-28.
- The user confirmed private tunnel-token rotation/service update and approved a tested live migration with no games in progress. That approval is not evidence that Docker migration, promotion, rollback drills or scheduled activation have occurred.
- Archify architecture based on commit `00f98fb923852efdb49fd9c617d4458d10f3e072` passed schema, artifact, strict provenance and real-browser gates. Four browser captures were produced; the 1440×900 dark preview was inspected for labels, routes and containment. Local artifacts are under ignored `.archify/architecture-cat-coup-20261027-010000/`.

## Deployment handoff: 2026-10-28

- Explicit [promotion run 40636890569](https://github.com/jkznx/cat-coup-project-for-fun/actions/runs/40636890569) succeeded for CI run 40446705744. Release: `deploy-40636890569`.
- Promoted image: `ghcr.io/jkznx/cat-coup-project-for-fun@sha256:23c89928e4d840aefb80c6c8cb1116d34be8e13919d04f247be1981253ba0b2f`; source commit `982443f597d66b24e1545587f24f23ebbbc4e77e`.
- Private host configuration and local admin credential were prepared outside the Git checkout with restricted Windows ACLs. No secret contents were displayed or committed. Normal public DNS resolution succeeded; Cloudflared was Running/Automatic.
- Bootstrap stopped at the Docker pull because the Linux engine pipe was unavailable. No live app was replaced and no scheduled deployment task was enabled.
- The user then explicitly requested pausing deployment and receiving Archify/performance results. Keep migration, rollback drills and task activation paused until the user resumes them.

## Functional checks

- `node --import tsx --test tests/*.test.ts`: 11 passed, 0 failed.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `node node_modules/vite/bin/vite.js build`: passed.
- Real Edge browser walkthrough at 1440×1000 and 390×844: passed, with no page errors or horizontal document overflow.
- Walkthrough: create room, join from an isolated browser context, ready/deal, income, tax/accept claim, reload restores seat, hide/show private hand, open and dismiss named rules dialog.
- Rules tests include full games for 2–6 players, coin/card conservation and challenge/block edge cases. This is engine verification; a complete six-person Internet session was not conducted.

The walkthrough script accepts `PLAYWRIGHT_MODULE` for an external Playwright installation. The local run used the installed Codex runtime package and Edge. No test-only state endpoints or fixed-card modes are exposed by the server.

## Visual and accessibility review

A fresh reviewer inspected desktop/mobile entry, desktop lobby and desktop/mobile game screenshots against SURFACE.md, PRODUCT.md and the craft floor. Its one material finding was an unnamed rules dialog. The dialog now uses `aria-labelledby="rules-title"`, and the browser test finds it by that accessible name. The reviewer scored the fix resolved and returned final disposition **ship** at that scope.

The mechanical detector ran once and reported one warning: Geist is commonly used. The face is retained as the confirmed direction's readable control font; original cat artwork and the lounge palette carry the identity. The reviewer accepted that decision. A nonblocking review note remains: disabled action descriptions are muted while waiting.

Review captures are stored locally under `.impeccable/review/` and ignored by Git. This review does not establish a full WCAG audit, screen-reader testing, six-player visual density, public hosting readiness, or protection against Internet-scale abuse.

## Asset provenance

The shipping cat portrait PNG carries its exact generation prompt in embedded PNG metadata. The provenance scan found one raster and zero missing records. A human-readable origin summary is in `public/assets/PROVENANCE.md`.

## Public tunnel verification

On 2026-10-26, the published application `https://cat-coup.jukrachai-crybaby.space` routed to the existing Windows Node server at `http://localhost:3001` through the Cloudflared Windows service.

- HTTPS `/health` returned `{"ok":true}` with certificate validation enabled.
- Two isolated Edge browser contexts opened the public HTTPS page, created and joined the same room, observed the second player, and left the room successfully.
- The browser observed five received WebSocket frames. Both test clients were closed after leaving; no game was started.
- The Windows resolver initially returned “No such host is known.” Google public DNS returned A records `104.21.35.91` and `172.67.216.109`. These checks used a request/browser-scoped hostname resolution override to the first address; no system DNS or hosts-file changes and no TLS bypass were used.

This verifies the public edge route and lobby/WebSocket path from this PC. It does not establish normal DNS resolution on this PC, a separate-network multiplayer session, isolated polling-only fallback, or complete Internet gameplay. Tunnel credential rotation remains unconfirmed after the installation token was disclosed in chat; no token is stored here.

## Delivery state

Locally runnable multiplayer game with a verified Cloudflare public route to the Windows Node server. Default listener: `127.0.0.1:3001`. Docker packaging and CI/CD are not implemented. Room state is in memory; see README.md for reconnect, restart, lobby and hosting limits.
