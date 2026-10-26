# Cat Coup

A cat-themed multiplayer adaptation of Coup for 2–6 friends. Create a room, share its six-character code, ready up, and bluff your way to the last hidden influence. Original illustrated cats inhabit the Midnight Cat Lounge: dark blue, warm gold, and a private hand for each player.

## Run

Requirements: Node.js 24.22.1 and pnpm 11.25.0 (the tested deployment versions). From this directory:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Open http://127.0.0.1:3001. For a second local player, use another browser profile or a private window. The same tab restores its seat on refresh. For development, `pnpm dev` runs Vite on port 5173 and the game server on port 3001.

## Play with friends

The game supports separate clients over Socket.IO. The default address listens only on this computer. To serve on a trusted local network, set `HOST=0.0.0.0` before `pnpm start`, allow your chosen port in the host firewall, and share `http://<host-LAN-IP>:3001`. All players must reach that same server; a room code alone does not connect separate local servers.

The public hostname is https://cat-coup.jukrachai-crybaby.space through the Windows Cloudflared service. Use one server instance. `PORT` defaults to 3001. See [DEPLOYMENT.md](DEPLOYMENT.md) for container migration, CI, explicit release promotion, drain and rollback. The existing Node server is not automatically replaced by installing these files.

## Included

- Room creation/joining, ready lobby, host-controlled deal, invite link, rematch.
- Income, foreign aid, coup, tax, assassination, steal, exchange, challenge and block decisions.
- Server-controlled legal moves, coin costs, card replacement, influence loss, elimination and victory.
- Player-specific snapshots that exclude opponents’ hidden roles, card identifiers and the deck.
- Private session credential, refresh/reconnection, stale-command rejection, bounded event payloads and per-connection request rate limits.
- Original five-character artwork, responsive desktop/phone UI, keyboard focus, in-game help and reduced-motion support.

## Operational limits

Rooms live in memory and disappear when the server restarts. An offline living player pauses the table until they return; there is no timeout or bot takeover. Preserve the original browser tab/session to reconnect. A disconnected lobby seat also remains reserved; its owner can reconnect and leave. The host must return to start or open a rematch. Idle lobbies and completed games with everyone offline expire after six hours. Unfinished games are retained and block deployment, even when everyone disconnects. This release has no accounts, durable storage, matchmaking or spectator entry.

When a claim is challenged, the server automatically proves it if the claimant has that hidden role; voluntary concession despite holding the role is not offered. Base-game mechanics are included; expansion factions are outside this version.

## Verification

```sh
pnpm test
pnpm build
```

Eleven automated tests cover rules and the Socket.IO boundary, including complete 2–6 player games, card/coin conservation, assassination edge cases, private hands, readiness, turn validation and reconnection. The browser walkthrough covers 1440×1000 and 390×844 layouts, create/join/ready/deal, income, tax, refresh, hand visibility and the rules dialog. To rerun it, install Playwright separately, make Edge available, start the production server, and run `node tests/browser-check.mjs`. Alternatively set `PLAYWRIGHT_MODULE` to an installed Playwright package path. Review captures/results are local files under `.impeccable/review/` and are ignored by Git.

## Source and credits

Game design: Rikki Tahta / La Mame Games. Rules reference: [Coup rulebook](https://www.qugs.org/rules/r131357.pdf). This independent fan prototype uses original cat artwork and interface text. The original game’s illustrations and branding are not included. Artwork provenance is recorded in `public/assets/PROVENANCE.md`.

Source layout: `server/game.ts` holds the rules and redacted views; `server/index.ts` handles rooms and sockets; `src/main.tsx` is the React UI; `src/style.css` owns the visual system.
