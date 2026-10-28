import { randomInt, randomUUID } from 'node:crypto';

import {ACTIONS, modeRoles, blockRoles, type Role, type Mode, type Action} from './roles.js';
export {ROLES, ACTIONS, blockRoles} from './roles.js';
export type {Role, Action, Mode} from './roles.js';
export interface Card { id: string; role: Role; revealed: boolean }
export interface Player { id: string; name: string; cards: Card[]; coins: number }
interface Pending { actor: string; action: Action; target?: string; blocker?: string; blockRole?: Role }
type Continuation = 'finish' | 'block' | 'resolve';
export interface Game {
  mode: Mode; players: Player[]; deck: Card[]; treasury: number; turn: number; revision: number;
  phase: 'action' | 'claim' | 'block' | 'blockClaim' | 'loss' | 'exchange' | 'over';
  pending: Pending | null; passed: string[]; loss?: { player: string; next: Continuation };
  exchange?: Card[]; winner?: string; log: string[];
}
export type Command = { type: 'action'; action: Action; target?: string }
  | { type: 'pass' } | { type: 'challenge' } | { type: 'block'; role: Role }
  | { type: 'lose'; card: string } | { type: 'exchange'; cards: string[] };
const living = (p: Player) => p.cards.some(c => !c.revealed);
function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i--) { const j = randomInt(i + 1); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}
export function createGame(seats: { id: string; name: string }[], mode: Mode = 'classic'): Game {
  if (mode !== 'classic' && mode !== 'vintage') throw Error('Unknown game mode.');
  if (seats.length < 2 || seats.length > 6 || new Set(seats.map(p => p.id)).size !== seats.length) throw Error('Use 2–6 unique players.');
  const deck = shuffle(modeRoles(mode).flatMap(role => Array.from({ length: 3 }, () => ({ id: randomUUID(), role, revealed: false }))));
  const players = seats.map((s, i) => ({ ...s, coins: seats.length === 2 && i === 0 ? 1 : 2, cards: [deck.pop()!, deck.pop()!] }));
  return { mode, players, deck, treasury: 50 - players.reduce((n, p) => n + p.coins, 0), turn: 0, revision: 0,
    phase: 'action', pending: null, passed: [], log: ['The cards are dealt. Trust your instincts, not the cats.'] };
}
function player(g: Game, id: string) { const p = g.players.find(p => p.id === id); if (!p) throw Error('Player not found.'); return p; }
function note(g: Game, text: string) { g.log.push(text); g.log = g.log.slice(-100); }
function give(g: Game, p: Player, n: number) { const value = Math.min(n, g.treasury); p.coins += value; g.treasury -= value; }
function end(g: Game) {
  g.pending = null; g.loss = undefined; g.exchange = undefined; g.passed = [];
  const alive = g.players.filter(living);
  if (alive.length === 1) { g.phase = 'over'; g.winner = alive[0].id; note(g, `${alive[0].name} rules the cat court!`); return; }
  do { g.turn = (g.turn + 1) % g.players.length; } while (!living(g.players[g.turn]));
  g.phase = 'action';
}
function lose(g: Game, id: string, next: Continuation) {
  if (!living(player(g, id))) { proceed(g, next); return; }
  g.phase = 'loss'; g.loss = { player: id, next }; g.passed = [];
}
function blockStage(g: Game) {
  const p = g.pending!;
  if (p.target && !living(player(g, p.target))) { end(g); return; }
  if (!blockRoles(p.action,g.mode).length) { resolve(g); return; }
  g.phase = 'block'; g.passed = [];
}
function resolve(g: Game) {
  const p = g.pending!, actor = player(g, p.actor), target = p.target ? player(g, p.target) : undefined;
  if (p.action === 'income') give(g, actor, 1);
  if (p.action === 'aid') give(g, actor, 2);
  if (p.action === 'tax') give(g, actor, 3);
  if (p.action === 'market') give(g, actor, 2);
  if (p.action === 'plunder' && target && living(target)) { const n=Math.min(3,target.coins); target.coins-=n; actor.coins+=n; }
  if (p.action === 'steal' && target && living(target)) { const n = Math.min(2, target.coins); target.coins -= n; actor.coins += n; }
  if ((p.action === 'coup' || p.action === 'assassinate') && target && living(target)) { lose(g, target.id, 'finish'); return; }
  if (p.action === 'exchange' && living(actor)) { g.phase = 'exchange'; g.exchange = [g.deck.pop()!, g.deck.pop()!]; return; }
  end(g);
}
function proceed(g: Game, next: Continuation) {
  g.loss = undefined;
  if (g.players.filter(living).length === 1) { end(g); return; }
  if (next === 'finish') end(g); else if (next === 'block') blockStage(g); else resolve(g);
}
export function responders(g: Game): string[] {
  if (!g.pending) return [];
  const p = g.pending;
  return g.players.filter(q => living(q) && !g.passed.includes(q.id) && (
    g.phase === 'claim' ? q.id !== p.actor : g.phase === 'blockClaim' ? q.id !== p.blocker :
    g.phase === 'block' ? (p.action === 'aid' ? q.id !== p.actor : q.id === p.target) : false
  )).map(q => q.id);
}
// Commands commit atomically; invalid input leaves the previous game untouched.
export function command(previous: Game, id: string, cmd: Command): Game {
  const g = structuredClone(previous), me = player(g, id);
  if (!cmd || typeof cmd !== 'object' || !living(me) || g.phase === 'over') throw Error('That move is unavailable.');
  if (cmd.type === 'action') {
    if (g.phase !== 'action' || g.players[g.turn].id !== id) throw Error('Wait for your turn.');
    if (!Object.hasOwn(ACTIONS, cmd.action)) throw Error('Unknown action.');
    const action = ACTIONS[cmd.action];
    if (action.vintage && g.mode !== 'vintage') throw Error('That action is only available in Vintage mode.');
    if (me.coins >= 10 && cmd.action !== 'coup') throw Error('At 10 coins, you must coup.');
    if (me.coins < action.cost) throw Error('You do not have enough coins.');
    if (action.targeted && (!cmd.target || cmd.target === id || !living(player(g, cmd.target)))) throw Error('Choose an active opponent.');
    me.coins -= action.cost; g.treasury += action.cost;
    g.pending = { actor: id, action: cmd.action, target: action.targeted ? cmd.target : undefined }; g.passed = [];
    note(g, `${me.name} declares ${cmd.action}${action.role ? ` (${action.role})` : ''}${action.targeted ? ` against ${player(g, cmd.target!).name}` : ''}.`);
    if (action.role) g.phase = 'claim'; else if (cmd.action === 'aid') blockStage(g); else resolve(g);
  } else if (cmd.type === 'pass') {
    if (!responders(g).includes(id)) throw Error('No response is needed from you.');
    g.passed.push(id);
    if (!responders(g).length) {
      if (g.phase === 'claim') blockStage(g);
      else if (g.phase === 'block') resolve(g);
      else { note(g, 'The block stands.'); end(g); }
    }
  } else if (cmd.type === 'block') {
    const p = g.pending;
    if (g.phase !== 'block' || !p || !responders(g).includes(id) || !blockRoles(p.action,g.mode).includes(cmd.role)) throw Error('That block is unavailable.');
    p.blocker = id; p.blockRole = cmd.role; g.phase = 'blockClaim'; g.passed = [];
    note(g, `${me.name} blocks with a claimed ${cmd.role}.`);
  } else if (cmd.type === 'challenge') {
    if (!['claim', 'blockClaim'].includes(g.phase) || !responders(g).includes(id)) throw Error('That claim cannot be challenged now.');
    const p = g.pending!, isBlock = g.phase === 'blockClaim';
    const claimant = player(g, isBlock ? p.blocker! : p.actor);
    const role = isBlock ? p.blockRole! : ACTIONS[p.action].role!;
    const card = claimant.cards.find(c => !c.revealed && c.role === role);
    if (card) {
      note(g, `${me.name} challenges. ${claimant.name} proves ${role} and draws a replacement. ${me.name} loses influence.`);
      const index = claimant.cards.indexOf(card); g.deck.push(card); shuffle(g.deck); claimant.cards[index] = g.deck.pop()!;
      lose(g, me.id, isBlock ? 'finish' : 'block');
    } else {
      note(g, `${me.name} catches ${claimant.name} bluffing ${role}.`);
      if (!isBlock) { const cost = ACTIONS[p.action].cost; claimant.coins += cost; g.treasury -= cost; }
      lose(g, claimant.id, isBlock ? 'resolve' : 'finish');
    }
  } else if (cmd.type === 'lose') {
    if (g.phase !== 'loss' || g.loss?.player !== id) throw Error('You do not need to reveal a card.');
    const card = me.cards.find(c => c.id === cmd.card && !c.revealed);
    if (!card) throw Error('Choose one of your hidden cards.');
    card.revealed = true; note(g, `${me.name} reveals ${card.role}.`);
    if (!living(me)) { g.treasury += me.coins; me.coins = 0; note(g, `${me.name} is out of the court.`); }
    proceed(g, g.loss.next);
  } else if (cmd.type === 'exchange') {
    if (g.phase !== 'exchange' || g.pending?.actor !== id || !Array.isArray(cmd.cards)) throw Error('No exchange is pending.');
    const hidden = me.cards.filter(c => !c.revealed), pool = [...hidden, ...g.exchange!];
    if (cmd.cards.length !== hidden.length || new Set(cmd.cards).size !== cmd.cards.length || cmd.cards.some(id => !pool.some(c => c.id === id))) throw Error(`Keep exactly ${hidden.length} cards.`);
    me.cards = [...me.cards.filter(c => c.revealed), ...pool.filter(c => cmd.cards.includes(c.id))];
    g.deck.push(...pool.filter(c => !cmd.cards.includes(c.id))); shuffle(g.deck); note(g, `${me.name} finishes exchanging.`); end(g);
  } else throw Error('Unknown move.');
  g.revision++; return g;
}
export function snapshot(g: Game, viewer: string) {
  return {
    players: g.players.map(p => ({ ...p, cards: p.cards.map(c => p.id === viewer || c.revealed ? c : { revealed: false }) })),
    mode: g.mode, treasury: g.treasury, deckCount: g.deck.length, turn: g.players[g.turn].id, revision: g.revision,
    phase: g.phase, pending: g.pending, responders: responders(g), lossPlayer: g.loss?.player,
    exchange: g.phase === 'exchange' && g.pending?.actor === viewer ? g.exchange : undefined,
    winner: g.winner, log: g.log,
  };
}
export type View = ReturnType<typeof snapshot>;
