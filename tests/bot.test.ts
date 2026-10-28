import test from 'node:test';
import assert from 'node:assert/strict';
import { botMove } from '../server/bot.js';
import { createGame, command, snapshot } from '../server/game.js';
import { createApp } from '../server/index.js';
import { io as connect } from 'socket.io-client';

test('test bots finish games for 2–6 seats using redacted views and legal commands', () => {
  for (let count=2; count<=6; count++) for (let run=0; run<5; run++) {
    let game = createGame(Array.from({length:count}, (_,i)=>({id:String(i),name:`Bot ${i}`})));
    for (let step=0; step<2000 && game.phase!=='over'; step++) {
      const actor = game.players.find(p => botMove(snapshot(game,p.id),p.id));
      assert.ok(actor, 'Every nonterminal phase has a legal bot decision');
      const view = snapshot(game,actor.id);
      assert.ok(view.players.filter(p=>p.id!==actor.id).every(p=>p.cards.every(c=>c.revealed||!('role' in c))));
      game = command(game,actor.id,botMove(view,actor.id)!);
      assert.equal(game.players.reduce((n,p)=>n+p.coins,game.treasury),50);
      assert.equal(game.players.reduce((n,p)=>n+p.cards.length,game.deck.length+(game.exchange?.length||0)),15);
    }
    assert.equal(game.phase,'over');
  }
});

test('only host manages lobby bots; bots act, pause for offline humans, and resume', async () => {
  const {http,io} = createApp({botDelayMs:100});
  await new Promise<void>(r=>http.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${(http.address() as any).port}`;
  const clients:any[]=[]; let view:any;
  const client=async()=>{const s=connect(url,{transports:['websocket'],reconnection:false});clients.push(s);await new Promise<void>((r,j)=>{s.once('connect',r);s.once('connect_error',j)});return s};
  const send=(s:any,e:string,d={})=>s.timeout(2000).emitWithAck(e,d);
  const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
  try {
    const host=await client(), guest=await client(); host.on('room',(r:any)=>view=r);
    const session=await send(host,'enter',{name:'Host'}); await send(guest,'enter',{name:'Guest',code:session.code});
    assert.equal((await send(guest,'add-bot')).ok,false);
    await send(guest,'leave');
    assert.equal((await send(host,'add-bot')).ok,true); await wait(20);
    const bot=view.seats.find((s:any)=>s.bot); assert.equal(bot.ready,true); assert.equal('token' in bot,false);
    assert.equal((await send(host,'remove-bot',{id:bot.id})).ok,true);
    await send(host,'add-bot'); await send(host,'ready'); assert.equal((await send(host,'start')).ok,true);
    assert.equal((await send(host,'add-bot')).ok,false);
    await send(host,'move',{revision:0,command:{type:'action',action:'income'}});
    host.disconnect(); await wait(180);
    const replacement=await client(); replacement.on('room',(r:any)=>view=r);
    await send(replacement,'resume',{code:session.code,token:session.token}); await wait(20);
    assert.equal(view.game.revision,1,'Offline living human pauses bot turns');
    await wait(160); assert.ok(view.game.revision>=2,'Bot resumes after human reconnects');
    assert.ok(view.game.players.find((p:any)=>p.id!==view.me).cards.every((c:any)=>!('role' in c)));
  } finally {clients.forEach(s=>s.disconnect());await new Promise<void>(r=>io.close(()=>r()));}
});
