# Verification record

Verified 2026-10-26, Asia/Bangkok.

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
