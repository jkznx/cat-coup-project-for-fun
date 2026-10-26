import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, command, snapshot, responders, type Game, type Role } from '../server/game.js';

const seats = [{ id: 'a', name: 'Miso' }, { id: 'b', name: 'Mochi' }, { id: 'c', name: 'Bean' }];
function fixed(roles: Role[][]): Game {
  const g = createGame(seats.slice(0, roles.length));
  const pool = [...g.deck, ...g.players.flatMap(p => p.cards)];
  g.players.forEach((p, i) => { p.cards = roles[i].map(role => pool.splice(pool.findIndex(c => c.role === role), 1)[0]); });
  g.deck = pool; return g;
}
function pass(g: Game) { while (['claim','block','blockClaim'].includes(g.phase)) g = command(g, responders(g)[0], { type: 'pass' }); return g; }
function invariant(g: Game) {
  const cards = [...g.deck, ...g.players.flatMap(p => p.cards), ...(g.exchange || [])];
  assert.equal(cards.length, 15); assert.equal(new Set(cards.map(c => c.id)).size, 15);
  assert.equal(g.treasury + g.players.reduce((s, p) => s + p.coins, 0), 50);
  assert.ok(g.players.every(p => p.coins >= 0));
}
test('setup deals private hands and honors two-player starting coin', () => {
  for (let n = 2; n <= 6; n++) {
    const g = createGame(Array.from({length:n},(_,i)=>({id:String(i),name:`Cat ${i}`})));
    assert.equal(g.players[0].coins, n === 2 ? 1 : 2); invariant(g);
    const view = snapshot(g, '0');
    assert.ok('role' in view.players[0].cards[0]);
    assert.deepEqual(view.players[1].cards, [{revealed:false},{revealed:false}]);
    assert.equal('deck' in view, false);
  }
});
test('invalid actions do not mutate state; ten coins force a coup', () => {
  const g = createGame(seats); const before = structuredClone(g);
  assert.throws(()=>command(g,'b',{type:'action',action:'income'}));
  assert.throws(()=>command(g,'a',{type:'action',action:'coup',target:'b'}));
  assert.deepEqual(g,before); g.players[0].coins=10; g.treasury-=8;
  assert.throws(()=>command(g,'a',{type:'action',action:'tax'}));
  const next=command(g,'a',{type:'action',action:'coup',target:'b'});
  assert.equal(next.phase,'loss'); assert.equal(next.players[0].coins,3); invariant(next);
});
test('income, aid and tax resolve with exact amounts', () => {
  for (const [action, amount] of [['income',1],['aid',2],['tax',3]] as const) {
    let g = createGame(seats); g=pass(command(g,'a',{type:'action',action}));
    assert.equal(g.players[0].coins,2+amount); assert.equal(g.turn,1); invariant(g);
  }
});
test('truthful challenge replaces proof card and challenger chooses loss', () => {
  let g=fixed([['Duke','Captain'],['Assassin','Contessa'],['Ambassador','Duke']]);
  g=command(g,'a',{type:'action',action:'tax'}); g=command(g,'b',{type:'challenge'});
  assert.equal(g.loss?.player,'b'); assert.equal(g.players[0].cards.filter(c=>!c.revealed).length,2);
  g=command(g,'b',{type:'lose',card:g.players[1].cards[1].id});
  assert.equal(g.players[1].cards[1].revealed,true); assert.equal(g.players[0].coins,5); invariant(g);
});
test('caught assassination bluff refunds fee', () => {
  let g=fixed([['Duke','Captain'],['Assassin','Contessa'],['Ambassador','Duke']]);
  g.players[0].coins=3; g.treasury--;
  g=command(g,'a',{type:'action',action:'assassinate',target:'b'}); g=command(g,'c',{type:'challenge'});
  assert.equal(g.players[0].coins,3); assert.equal(g.loss?.player,'a');
  g=command(g,'a',{type:'lose',card:g.players[0].cards[0].id});
  assert.equal(g.turn,1); assert.ok(g.players[1].cards.every(c=>!c.revealed)); invariant(g);
});
test('unchallenged Contessa block spends assassination fee', () => {
  let g=fixed([['Assassin','Captain'],['Duke','Contessa'],['Ambassador','Duke']]);
  g.players[0].coins=3; g.treasury--;
  g=command(g,'a',{type:'action',action:'assassinate',target:'b'});
  g=command(g,'b',{type:'pass'}); g=command(g,'c',{type:'pass'});
  g=command(g,'b',{type:'block',role:'Contessa'}); g=pass(g);
  assert.equal(g.players[0].coins,0); assert.ok(g.players[1].cards.every(c=>!c.revealed)); invariant(g);
});
test('false Contessa block can cost both influences', () => {
  let g=fixed([['Assassin','Captain'],['Duke','Captain'],['Ambassador','Duke']]);
  g.players[0].coins=3; g.treasury--;
  g=command(g,'a',{type:'action',action:'assassinate',target:'b'});
  g=command(g,'b',{type:'pass'}); g=command(g,'c',{type:'pass'});
  g=command(g,'b',{type:'block',role:'Contessa'}); g=command(g,'c',{type:'challenge'});
  g=command(g,'b',{type:'lose',card:g.players[1].cards[0].id});
  assert.equal(g.loss?.player,'b');
  g=command(g,'b',{type:'lose',card:g.players[1].cards[1].id});
  assert.equal(g.players[1].coins,0); assert.equal(g.turn,2); invariant(g);
});
test('steal only takes available coins and non-target cannot block', () => {
  let g=createGame(seats); g.players[1].coins=1; g.treasury++;
  g=command(g,'a',{type:'action',action:'steal',target:'b'});
  g=command(g,'b',{type:'pass'}); g=command(g,'c',{type:'pass'});
  assert.throws(()=>command(g,'c',{type:'block',role:'Captain'}));
  g=pass(g); assert.equal(g.players[0].coins,3); assert.equal(g.players[1].coins,0); invariant(g);
});
test('exchange hides drawn cards, rejects duplicate selections, conserves deck', () => {
  let g=pass(command(createGame(seats),'a',{type:'action',action:'exchange'}));
  assert.equal(g.phase,'exchange'); assert.equal(snapshot(g,'b').exchange,undefined);
  const choices=g.exchange!.map(c=>c.id);
  assert.throws(()=>command(g,'a',{type:'exchange',cards:[choices[0],choices[0]]}));
  g=command(g,'a',{type:'exchange',cards:choices}); assert.equal(g.turn,1); invariant(g);
});
test('complete games finish and preserve cards and coins', () => {
  for(let n=2;n<=6;n++) {
    let g=createGame(Array.from({length:n},(_,i)=>({id:String(i),name:`Cat ${i}`})));
    for(let steps=0;g.phase!=='over' && steps<800;steps++) {
      if(g.phase==='action') {
        const p=g.players[g.turn], target=g.players.find(q=>q.id!==p.id&&q.cards.some(c=>!c.revealed))!;
        g=command(g,p.id,{type:'action',action:p.coins>=7?'coup':'income',target:target.id});
      } else if(g.phase==='loss') {
        const p=g.players.find(p=>p.id===g.loss!.player)!; g=command(g,p.id,{type:'lose',card:p.cards.find(c=>!c.revealed)!.id});
      } else g=pass(g);
      invariant(g);
    }
    assert.equal(g.phase,'over'); assert.ok(g.winner);
  }
});
