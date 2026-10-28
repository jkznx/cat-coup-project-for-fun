import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/index.js';
import {io as connect} from 'socket.io-client';
test('voice signaling is opt-in, bounded and restricted to connected humans in the same room',async()=>{
  const {http,io}=createApp();await new Promise<void>(r=>http.listen(0,'127.0.0.1',r));
  const clients:any[]=[];const views=new Map<any,any>();
  const make=async()=>{const s=connect(`http://127.0.0.1:${(http.address() as any).port}`,{transports:['websocket'],reconnection:false});clients.push(s);s.on('room',(r:any)=>views.set(s,r));await new Promise<void>((r,j)=>{s.once('connect',r);s.once('connect_error',j)});return s;};
  const send=(s:any,event:string,data={})=>s.timeout(2000).emitWithAck(event,data);
  try{
    const a=await make(),b=await make(),outsider=await make();
    const host=await send(a,'enter',{name:'A'});await send(b,'enter',{name:'B',code:host.code});await send(outsider,'enter',{name:'Outside'});
    await new Promise(r=>setTimeout(r,20));const target=views.get(b).me;
    const data={to:target,kind:'offer',payload:{type:'offer',sdp:'v=0'}};
    assert.equal((await send(a,'voice-signal',data)).ok,false);
    await send(a,'voice-join',{enabled:true});assert.equal((await send(a,'voice-signal',data)).ok,false);
    await send(b,'voice-join',{enabled:true});await send(outsider,'voice-join',{enabled:true});
    assert.equal((await send(outsider,'voice-signal',data)).ok,false);
    const received=new Promise<any>(r=>b.once('voice-signal',r));assert.equal((await send(a,'voice-signal',{...data,from:'forged'})).ok,true);
    assert.equal((await received).from,views.get(a).me);
    assert.equal((await send(a,'voice-signal',{...data,payload:{type:'offer',sdp:'x'.repeat(6500)}})).ok,false);
    await send(b,'voice-join',{enabled:false});assert.equal((await send(a,'voice-signal',data)).ok,false);
  }finally{clients.forEach(s=>s.disconnect());await new Promise<void>(r=>io.close(()=>r()));}
});
