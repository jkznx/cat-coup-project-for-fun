import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,command,responders,snapshot,type Game,type Role} from '../server/game.js';
import {modeRoles,blockRoles} from '../server/roles.js';
import {botMove} from '../server/bot.js';
const seats=Array.from({length:6},(_,i)=>({id:String(i),name:`Cat ${i}`}));
function fixed(roles:Role[][]){const g=createGame(seats.slice(0,roles.length),'vintage');const pool=[...g.deck,...g.players.flatMap(p=>p.cards)];g.players.forEach((p,i)=>{p.cards=roles[i].map(r=>pool.splice(pool.findIndex(c=>c.role===r),1)[0]);});g.deck=pool;return g;}
function pass(g:Game){while(['claim','block','blockClaim'].includes(g.phase))g=command(g,responders(g)[0],{type:'pass'});return g;}
function invariant(g:Game){const all=[...g.deck,...g.players.flatMap(p=>p.cards),...(g.exchange||[])];assert.equal(all.length,modeRoles(g.mode).length*3);assert.equal(new Set(all.map(c=>c.id)).size,all.length);assert.equal(g.treasury+g.players.reduce((s,p)=>s+p.coins,0),50);assert.ok(g.players.every(p=>p.coins>=0));}
test('Classic remains five roles; Vintage has eight, private cards and mode-specific actions',()=>{
 for(const mode of ['classic','vintage'] as const)for(let n=2;n<=6;n++){const g=createGame(seats.slice(0,n),mode);invariant(g);assert.equal(g.deck.length,(mode==='classic'?15:24)-2*n);assert.deepEqual(snapshot(g,'0').players[1].cards,[{revealed:false},{revealed:false}]);assert.equal(snapshot(g,'0').mode,mode);}
 const classic=createGame(seats);assert.throws(()=>command(classic,'0',{type:'action',action:'market'}));assert.throws(()=>command(classic,'0',{type:'action',action:'plunder',target:'1'}));assert.deepEqual(blockRoles('steal'),['Captain','Ambassador']);assert.deepEqual(blockRoles('plunder'),[]);
});
test('Merchant market is challengeable, cannot be blocked, and caps at treasury',()=>{
 let g=fixed([['Merchant','Duke'],['Captain','Guardian']]);g=command(g,'0',{type:'action',action:'market'});assert.equal(g.phase,'claim');g=command(g,'1',{type:'challenge'});assert.equal(g.loss?.player,'1');g=command(g,'1',{type:'lose',card:g.players[1].cards[0].id});assert.equal(g.players[0].coins,3);assert.equal(g.turn,1);invariant(g);
 g=fixed([['Merchant','Duke'],['Captain','Guardian']]);g.players[1].coins+=g.treasury-1;g.treasury=1;g=pass(command(g,'0',{type:'action',action:'market'}));assert.equal(g.players[0].coins,2);assert.equal(g.treasury,0);invariant(g);
});
test('Bandit pays one, steals at most three, Guardian can block and a caught bluff refunds',()=>{
 let g=fixed([['Bandit','Duke'],['Captain','Guardian']]);g.players[1].coins=4;g.treasury-=2;g=pass(command(g,'0',{type:'action',action:'plunder',target:'1'}));assert.equal(g.players[0].coins,3);assert.equal(g.players[1].coins,1);invariant(g);
 g=fixed([['Bandit','Duke'],['Captain','Guardian']]);g=command(g,'0',{type:'action',action:'plunder',target:'1'});g=command(g,'1',{type:'pass'});assert.throws(()=>command(g,'1',{type:'block',role:'Captain'}));g=pass(command(g,'1',{type:'block',role:'Guardian'}));assert.equal(g.players[0].coins,0);assert.equal(g.players[1].coins,2);invariant(g);
 g=fixed([['Merchant','Duke'],['Captain','Guardian']]);g=command(g,'0',{type:'action',action:'plunder',target:'1'});g=command(g,'1',{type:'challenge'});assert.equal(g.players[0].coins,1);assert.equal(g.loss?.player,'0');g=command(g,'0',{type:'lose',card:g.players[0].cards[0].id});assert.equal(g.turn,1);invariant(g);
});
test('Vintage blocks are challengeable, exchange conserves the 24-card deck and ten coins force coup',()=>{
 let g=fixed([['Captain','Merchant'],['Guardian','Duke']]);g=command(g,'0',{type:'action',action:'steal',target:'1'});g=command(g,'1',{type:'pass'});g=command(g,'1',{type:'block',role:'Guardian'});g=command(g,'0',{type:'challenge'});assert.equal(g.loss?.player,'0');g=command(g,'0',{type:'lose',card:g.players[0].cards[0].id});invariant(g);
 g=pass(command(createGame(seats,'vintage'),'0',{type:'action',action:'exchange'}));assert.equal(snapshot(g,'1').exchange,undefined);g=command(g,'0',{type:'exchange',cards:g.exchange!.map(c=>c.id)});invariant(g);
 g=createGame(seats,'vintage');g.treasury-=8;g.players[0].coins=10;assert.throws(()=>command(g,'0',{type:'action',action:'market'}));
});
test('Vintage bots finish complete games for every supported seat count',()=>{
 for(let n=2;n<=6;n++)for(let run=0;run<4;run++){let g=createGame(seats.slice(0,n),'vintage');for(let i=0;i<5000&&g.phase!=='over';i++){let moved=false;for(const p of g.players){const move=botMove(snapshot(g,p.id),p.id);if(move){g=command(g,p.id,move);moved=true;invariant(g);break;}}assert.ok(moved);}assert.equal(g.phase,'over');}
});

test('only the lobby host changes mode; changes reset human readiness and freeze at deal',async()=>{
 const {createApp}=await import('../server/index.js');const {io:connect}=await import('socket.io-client');
 const {http,io}=createApp({botDelayMs:10000});await new Promise<void>(r=>http.listen(0,'127.0.0.1',r));const clients:any[]=[];const views=new Map<any,any>();
 const make=async()=>{const s=connect(`http://127.0.0.1:${(http.address() as any).port}`,{transports:['websocket'],reconnection:false});clients.push(s);s.on('room',(r:any)=>views.set(s,r));await new Promise<void>((r,j)=>{s.once('connect',r);s.once('connect_error',j);});return s;};
 const send=(s:any,event:string,data={})=>s.timeout(2000).emitWithAck(event,data);
 try{
  const a=await make(),b=await make();const host=await send(a,'enter',{name:'Host'});await send(b,'enter',{name:'Guest',code:host.code});await send(a,'ready');await send(b,'ready');
  assert.equal((await send(b,'set-mode',{mode:'vintage'})).ok,false);assert.equal((await send(a,'set-mode',{mode:'invalid'})).ok,false);
  const changed=new Promise<void>(r=>a.once('room',()=>r()));assert.equal((await send(a,'set-mode',{mode:'vintage'})).ok,true);await changed;
  assert.equal(views.get(a).mode,'vintage');assert.ok(views.get(a).seats.every((s:any)=>!s.ready));assert.equal((await send(a,'start')).ok,false);
  await send(a,'ready');await send(b,'ready');const started=new Promise<void>(r=>a.once('room',()=>r()));await send(a,'start');await started;
  assert.equal(views.get(a).game.mode,'vintage');assert.equal(views.get(a).game.deckCount,20);assert.equal((await send(a,'set-mode',{mode:'classic'})).ok,false);
 }finally{clients.forEach(s=>s.disconnect());await new Promise<void>(r=>io.close(()=>r()));}
});
