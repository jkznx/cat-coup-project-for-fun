import { blockRoles, type Command, type View } from './game.js';

// Only the same redacted view a human seat receives, never another hand/deck.
export function botMove(view: View, id: string): Command | undefined {
  const me = view.players.find(p => p.id === id);
  const hidden = me?.cards.filter(c => !c.revealed && 'id' in c);
  if (!me || !hidden?.length || view.phase === 'over') return;
  if (view.phase === 'loss' && view.lossPlayer === id) return { type: 'lose', card: (hidden[0] as { id: string }).id };
  if (view.phase === 'exchange' && view.pending?.actor === id) return { type: 'exchange', cards: hidden.map(c => (c as { id: string }).id) };
  if (view.responders.includes(id)) {
    const roles = hidden.map(c => 'role' in c ? c.role : undefined);
    if (view.phase === 'block') {
      const possible = view.pending ? blockRoles(view.pending.action,view.mode) : [];
      const role = roles.find(r => r && possible.includes(r));
      if (role) return { type: 'block', role };
    }
    return { type: 'pass' };
  }
  if (view.phase !== 'action' || view.turn !== id) return;
  const target = view.players.find(p => p.id !== id && p.cards.some(c => !c.revealed));
  if (!target) return;
  if (me.coins >= 7) return { type: 'action', action: 'coup', target: target.id };
  if (hidden.some(c => 'role' in c && c.role === 'Duke')) return { type: 'action', action: 'tax' };
  if (view.mode==='vintage' && hidden.some(c=>'role' in c && c.role==='Merchant')) return {type:'action',action:'market'};
  return { type: 'action', action: 'income' };
}
