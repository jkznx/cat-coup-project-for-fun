# Cat Coup

## Confirmed request

Create a cat-character adaptation of Coup as an online multiplayer web game with room codes. Use original cat artwork and interface copy. Credit the original game design; do not copy the rulebook's illustrations or branding.

Rules reference: https://www.qugs.org/rules/r131357.pdf

## Rules implementation checklist

- Fifteen influence cards: three copies of each of five roles. Deal two cards per player and normally two coins; the starting player gets one coin in a two-player game.
- Income grants one coin; foreign aid grants two and can be blocked by Duke; tax claims Duke and grants three.
- Coup costs seven and removes one influence; it is compulsory at ten coins.
- Assassination claims Assassin, costs three, and can be blocked by the targeted Contessa.
- Stealing claims Captain, takes up to two coins, and can be blocked by the target claiming Captain or Ambassador.
- Exchange claims Ambassador, draws two, and returns two after choosing retained hidden influence.
- Role claims and blocks can be challenged. A proven role is shuffled back and replaced; the challenge loser reveals chosen influence.
- A successfully challenged action refunds its cost. A successfully blocked assassination does not.
- Eliminated players return coins. Last surviving player wins.

## Proposed implementation boundaries

- Room creation, room-code joining, lobby, ready state, server-controlled deal, private hands, public coins and revealed cards.
- Explicit action, target, challenge, block, influence-loss and exchange decisions.
- Server-side validation and player-specific snapshots; never broadcast the deck or other players' hidden cards.
- Reconnect using a private session credential. Room codes locate rooms; they are not player credentials.
- Responsive tabletop, five distinct cat portraits, visible turn status, action history and in-game help.
- Motion respects reduced-motion preferences and never obscures a pending decision.

## Confirmed decisions

- React + TypeScript client, Node.js + Socket.IO server.
- Midnight Cat Lounge: navy table, gold accents, warm original cat portraits; build directly in code.
- 2–6 players, reconnect in the original tab, pause while a living player is offline.
- Hosting provider and public deployment: not selected.

## Verification plan

Implemented test seam: server game commands and the private snapshots returned to each player. Eleven tests check legality, challenge/block resolution, elimination, card/coin conservation, hidden information, readiness, reconnects and complete engine games.

TypeScript checking and Vite production build pass. A real-browser walkthrough passes at 1440×1000 and 390×844, including room joining, ready/deal, income, tax, reload/reconnect, hide/show hand and keyboard dismissal of help. Complete game termination is verified at the rules-engine boundary for 2–6 players. Public hosting remains unconfigured.
