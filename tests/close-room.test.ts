import test from 'node:test';import assert from 'node:assert/strict';import {io as connect,type Socket} from 'socket.io-client';import {createApp} from '../server/index.js';

test('only host can explicitly close a live or paused room; all sessions invalidate and sockets can enter again',async()=>{
 const {http,io}=createApp({botDelayMs:20});await new Promise<void>(r=>http.listen(0,'127.0.0.1',r));const clients:Socket[]=[];
 const make=async()=>{const s=connect(`http://127.0.0.1:${(http.address() as any).port}`,{transports:['websocket'],reconnection:false});clients.push(s);await new Promise<void>((r,j)=>{s.once('connect',r);s.once('connect_error',j);});return s;};
 const send=(s:Socket,event:string,data={})=>s.timeout(2000).emitWithAck(event,data);
 try{
  const host=await make(),guest=await make(),offline=await make(),outsider=await make();const hs=await send(host,'enter',{name:'Host'});const gs=await send(guest,'enter',{name:'Guest',code:hs.code});const os=await send(offline,'enter',{name:'Offline',code:hs.code});
  await send(host,'add-bot');await send(host,'ready');await send(guest,'ready');await send(offline,'ready');await send(host,'start');
  assert.equal((await send(guest,'close-room',{confirm:true})).ok,false);assert.equal((await send(outsider,'close-room',{confirm:true})).ok,false);assert.equal((await send(host,'close-room')).ok,false);assert.equal((await send(host,'close-room',{confirm:'true'})).ok,false);
  offline.disconnect();await new Promise(r=>setTimeout(r,30));
  const closedHost=new Promise<any>(r=>host.once('room-closed',r)),closedGuest=new Promise<any>(r=>guest.once('room-closed',r));
  assert.equal((await send(host,'close-room',{confirm:true})).ok,true);assert.equal((await closedHost).code,hs.code);assert.equal((await closedGuest).code,hs.code);
  assert.equal((await send(host,'close-room',{confirm:true})).ok,false);assert.equal((await send(guest,'move',{revision:0,command:{type:'action',action:'income'}})).ok,false);assert.equal((await send(outsider,'enter',{name:'Late',code:hs.code})).ok,false);
  const reconnected=await make();assert.equal((await send(reconnected,'resume',{code:hs.code,token:os.token})).ok,false);assert.equal((await send(reconnected,'resume',{code:hs.code,token:gs.token})).ok,false);
  const next=await send(host,'enter',{name:'Host again'});assert.equal(next.ok,true);assert.equal((await send(guest,'enter',{name:'Guest again',code:next.code})).ok,true);
  assert.equal((await send(host,'close-room',{confirm:true})).ok,true);assert.equal((await send(reconnected,'resume',{code:hs.code,token:hs.token})).ok,false);
 }finally{clients.forEach(s=>s.disconnect());await new Promise<void>(r=>io.close(()=>r()));}
});

test('closing a room cancels pending bot work and does not affect another room',async()=>{
 const {http,io}=createApp({botDelayMs:30});await new Promise<void>(r=>http.listen(0,'127.0.0.1',r));const clients:Socket[]=[];const make=async()=>{const s=connect(`http://127.0.0.1:${(http.address() as any).port}`,{transports:['websocket'],reconnection:false});clients.push(s);await new Promise<void>(r=>s.once('connect',r));return s;};const send=(s:Socket,e:string,d={})=>s.timeout(2000).emitWithAck(e,d);
 try{const a=await make(),b=await make();await send(a,'enter',{name:'Host'});const other=await send(b,'enter',{name:'Other room'});await send(a,'add-bot');await send(a,'ready');await send(a,'start');await send(a,'move',{revision:0,command:{type:'action',action:'income'}});let snapshots=0;a.on('room',()=>snapshots++);await send(a,'close-room',{confirm:true});await new Promise(r=>setTimeout(r,120));assert.equal(snapshots,0);assert.equal((await send(b,'ready')).ok,true);assert.equal((await send(b,'close-room',{confirm:true})).ok,true);const late=await make();assert.equal((await send(late,'enter',{name:'Late',code:other.code})).ok,false);
 }finally{clients.forEach(s=>s.disconnect());await new Promise<void>(r=>io.close(()=>r()));}
});
