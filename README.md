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

Test bots: the room host can select **Add test bot** or **Remove a bot** before dealing. A room still has a maximum of six seats, including bots. Bots are ready automatically; the human host must ready up and deal. They use their own redacted view, take income/tax and coup, accept claims and make truthful blocks, and automatically reveal influence when required. They are basic practice opponents, not a difficulty-tuned AI. Living disconnected humans pause the bots too. Bots remain ready for a rematch and never become host.

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

Performance: `pnpm perf:budget` checks built asset budgets after a build. See [PERF.md](PERF.md) for the measured lossless artwork optimization and the next bounded measurement loops.

```sh
pnpm test
pnpm build
```

Twenty-two automated tests cover rules and the Socket.IO boundary, including complete 2–6 player games, card/coin conservation, assassination edge cases, private hands, readiness, turn validation and reconnection. The browser walkthrough covers 1440×1000 and 390×844 layouts, create/join/ready/deal, income, tax, refresh, hand visibility and the rules dialog. To rerun it, install Playwright separately, make Edge available, start the production server, and run `node tests/browser-check.mjs`. Alternatively set `PLAYWRIGHT_MODULE` to an installed Playwright package path. Review captures/results are local files under `.impeccable/review/` and are ignored by Git.

## Source and credits

Game design: Rikki Tahta / La Mame Games. Rules reference: [Coup rulebook](https://www.qugs.org/rules/r131357.pdf). This independent fan prototype uses original cat artwork and interface text. The original game’s illustrations and branding are not included. Artwork provenance is recorded in `public/assets/PROVENANCE.md`.

Source layout: `server/game.ts` holds the rules and redacted views; `server/index.ts` handles rooms and sockets; `src/main.tsx` is the React UI; `src/style.css` owns the visual system.

## Circular table and room voice

Players sit around a circular table, with your seat at the bottom. The table shows public coins, remaining influence and the current turn; your private hand remains below it.

Select **Enable voice** and allow microphone access to join room voice. Hold **T** to talk and release it to mute. On a touchscreen, hold the microphone button instead. Leaving the page, switching windows or disabling voice mutes/stops capture. Typing T in an input does not transmit. Every human must opt in; bots do not join voice.

Voice uses WebRTC between room participants; Socket.IO forwards bounded signaling only within the same room. Audio is not recorded by this app or relayed through its Node server. Use headphones to reduce feedback. Voice needs HTTPS (or localhost), microphone permission and a compatible browser. Peer connections can expose network addresses to other room participants. The default uses Cloudflare STUN only; restrictive NAT/firewall networks may need a separately configured TURN relay. The Cloudflare Tunnel serving the game does not itself relay WebRTC audio.

Verification: 22 automated rule/socket tests, production build and asset budgets pass. `tests/table-voice-browser.mjs` verifies two real local WebRTC peers using synthetic microphones, audio packet reception, T and pointer hold/release, blur muting, input typing isolation, device release and six-seat layouts at 320/390/768/1024/1440 px. Run against an isolated localhost server on port 3106 with Playwright and Edge (`PLAYWRIGHT_MODULE` and `BROWSER_CHANNEL=msedge`). This validates local synthetic voice, not every Internet network combination.

## Game modes

The lobby host selects **Classic** (default) or **Vintage** before dealing. Changing mode clears human readiness so everyone can review the rules; bots stay ready. Mode is frozen during a game and retained when opening a rematch lobby.

- **Classic:** Duke, Assassin, Captain, Ambassador, Contessa. Three of each role (15 cards), seven actions.
- **Vintage:** the Classic five plus Merchant, Bandit and Guardian. Three of each role (24 cards), nine actions. Two starting influences, 50 total coins, the two-player starting-coin rule and the mandatory coup at 10 coins are unchanged.

| Additional Vintage role | Ability |
| --- | --- |
| Merchant | Market: take up to 2 coins from the treasury. The claim can be challenged; the action cannot be blocked. |
| Bandit | Plunder: pay 1 coin to the treasury, then steal up to 3 available coins from one opponent. Only that target can block with Guardian. A successful block still spends the fee; a caught Bandit bluff refunds it. |
| Guardian | Block Captain's Steal or Bandit's Plunder against yourself. The block can be challenged. Guardian does not block assassination. |

Vintage is an original Cat Coup house variant, not an official Coup expansion. The larger deck changes role probabilities; competitive balance has not been established. New characters use original painted cat illustrations matching the five original portraits. Rules and block permissions live in `server/roles.ts`; both server and UI use the same catalogue. Bots handle mode-specific blocks and use Merchant when held, but retain their basic practice strategy.

`tests/modes.test.ts` verifies mode isolation, 15/24-card conservation, treasury limits, paid theft/refunds, truthful Guardian challenges, private exchanges, full Vintage bot games and lobby authorization/readiness. `tests/modes-browser.mjs` checks mode selection, eight-role help, action visibility, new portraits and mobile layouts against an isolated localhost server.


## Vintage storybook theme

Vintage rooms use a warm paper/ink skin with self-hosted Bree Serif headings, burgundy actions, teal voice controls and a wooden round table. Classic retains the Midnight Cat Lounge skin. The original five portraits remain byte-for-byte unchanged; Merchant, Bandit and Guardian use a separately generated painted sprite. See public/assets/PROVENANCE.md for origin and delivery details. The three new portraits add 199,714 bytes; their delivery budget is 250KB, separate from the unchanged Classic artwork cap. Mobile Vintage hands keep two cards side-by-side. Keyboard focus, disabled/selected/revealed states and hold-to-talk are retained.

## Card fit and spacing

The shared `src/Portrait.tsx` isolates sprite panels with an SVG viewBox and `xMidYMin slice`. Images scale uniformly and crop rather than stretch; the original files and bytes are unchanged. Both modes have responsive paired hands down to 320px. Homepage role names live in a readable wrapping legend rather than clipped fan captions.

`src/spacing.css` defines the confirmed scale: **4, 8, 16, 24, 32, 40, 48px**. Main margin, padding and gap declarations use these tokens. Borders, font sizes, automatic centering, fluid widths and deliberate table/fan geometry are separate concerns. `scripts/card-layout-audit.mjs` measures 29 viewport/surface combinations and checks uniform SVG transforms, paired cards, overflow and fixed spacing values.
