import {useEffect,useRef,useState} from 'react';
import type {Socket} from 'socket.io-client';
type VoiceRoom={code:string;me:string;seats:{id:string;voice?:boolean;connected:boolean;bot?:boolean}[]};
type Peer={pc:RTCPeerConnection;audio:HTMLAudioElement;ice:RTCIceCandidateInit[];chain:Promise<void>};
export function VoiceChat({socket,room}:{socket:Socket;room:VoiceRoom}) {
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[talking,setTalking]=useState(false),[error,setError]=useState(''),[linked,setLinked]=useState(0);
  const state=useRef({stream:null as MediaStream|null,peers:new Map<string,Peer>(),generation:0});
  const current=useRef(room); current.current=room;
  const mute=()=>{state.current.stream?.getAudioTracks().forEach(t=>{t.enabled=false;});setTalking(false);};
  const speak=()=>{if(state.current.stream && document.visibilityState==='visible'){state.current.stream.getAudioTracks().forEach(t=>{t.enabled=true;});setTalking(true);}};
  const stop=()=>{state.current.generation++;state.current.stream?.getTracks().forEach(t=>t.stop());state.current.stream=null;for(const p of state.current.peers.values()){p.pc.close();p.audio.srcObject=null;}state.current.peers.clear();setEnabled(false);setTalking(false);setLinked(0);};
  const signal=(to:string,kind:string,payload:unknown)=>{if(socket.connected)socket.timeout(5000).emit('voice-signal',{to,kind,payload},(err:Error|null,r:{ok:boolean})=>{if(err||!r?.ok)setError('Voice connection interrupted. Disable and enable voice to reconnect.');});};
  const peer=(id:string)=>{
    let p=state.current.peers.get(id);if(p)return p;
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
    const audio=new Audio();audio.autoplay=true;
    p={pc,audio,ice:[],chain:Promise.resolve()};state.current.peers.set(id,p);
    for(const t of state.current.stream!.getAudioTracks())pc.addTrack(t,state.current.stream!);
    pc.onicecandidate=e=>{if(e.candidate)signal(id,'ice',e.candidate.toJSON());};
    pc.ontrack=e=>{audio.srcObject=e.streams[0];void audio.play().catch(()=>setError('Tap Resume audio to hear the room.'));};
    pc.onconnectionstatechange=()=>{setLinked([...state.current.peers.values()].filter(x=>x.pc.connectionState==='connected').length);if(pc.connectionState==='failed')setError('Voice could not connect on this network. A TURN relay may be required.');};
    return p;
  };
  useEffect(()=>{
    const receive=(m:{from:string;kind:string;payload:any})=>{
      if(!state.current.stream||!current.current.seats.some(s=>s.id===m.from&&!s.bot&&s.connected))return;
      const p=peer(m.from);
      p.chain=p.chain.then(async()=>{
        if(p.pc.signalingState==='closed')return;
        if(m.kind==='ice'){if(p.pc.remoteDescription)await p.pc.addIceCandidate(m.payload);else p.ice.push(m.payload);return;}
        await p.pc.setRemoteDescription(m.payload);
        for(const ice of p.ice.splice(0))await p.pc.addIceCandidate(ice);
        if(m.kind==='offer'){await p.pc.setLocalDescription(await p.pc.createAnswer());signal(m.from,'answer',p.pc.localDescription!.toJSON());}
      }).catch(()=>setError('Voice handshake failed. Disable and enable voice to reconnect.'));
    };
    const keyDown=(e:KeyboardEvent)=>{if(e.code!=='KeyT'||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const el=e.target as HTMLElement;if(el.closest('input,textarea,select,[contenteditable="true"],dialog'))return;if(state.current.stream){e.preventDefault();speak();}};
    const keyUp=(e:KeyboardEvent)=>{if(e.code==='KeyT')mute();};
    const visibility=()=>{if(document.hidden)mute();};
    socket.on('voice-signal',receive).on('disconnect',stop);
    window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',mute);document.addEventListener('visibilitychange',visibility);
    return()=>{socket.off('voice-signal',receive).off('disconnect',stop);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',mute);document.removeEventListener('visibilitychange',visibility);if(socket.connected)socket.emit('voice-join',{enabled:false});stop();};
  },[room.code,room.me]);
  const ids=room.seats.filter(s=>s.id!==room.me&&s.voice&&s.connected&&!s.bot).map(s=>s.id).sort().join(',');
  useEffect(()=>{
    if(!enabled)return;
    const wanted=ids?ids.split(','):[];
    for(const [id,p] of state.current.peers)if(!wanted.includes(id)){p.pc.close();p.audio.srcObject=null;state.current.peers.delete(id);}
    for(const id of wanted)if(room.me<id&&!state.current.peers.has(id)){
      const p=peer(id);p.chain=p.chain.then(async()=>{await p.pc.setLocalDescription(await p.pc.createOffer());signal(id,'offer',p.pc.localDescription!.toJSON());}).catch(()=>setError('Unable to start a voice connection.'));
    }
  },[ids,enabled,room.me]);
  const enable=async()=>{
    if(enabled){socket.emit('voice-join',{enabled:false});stop();return;}
    const generation=++state.current.generation;setBusy(true);setError('');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw Error('Voice requires HTTPS or localhost and a supported browser.');
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      if(generation!==state.current.generation){stream.getTracks().forEach(t=>t.stop());return;}
      stream.getAudioTracks().forEach(t=>{t.enabled=false;t.onended=()=>{setError('Microphone stopped. Enable voice again to reconnect.');socket.emit('voice-join',{enabled:false});stop();};});state.current.stream=stream;
      const reply=await socket.timeout(5000).emitWithAck('voice-join',{enabled:true});
      if(!reply.ok)throw Error('Unable to join room voice.');
      if(generation!==state.current.generation)return;
      setEnabled(true);
    }catch(e){stop();setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Microphone permission was denied. Allow it in browser settings, then try again.':e instanceof Error?e.message:'Microphone unavailable.');}finally{setBusy(false);}
  };
  return <section className="voice-bar" aria-label="Room voice chat"><div><strong>Table voice</strong><span role="status">{talking?'Transmitting…':enabled?`${linked} connected · Hold T to talk`:'Microphone off · opt in to join'}</span></div><button className="quiet" disabled={busy} onClick={()=>void enable()}>{busy?'Requesting mic…':enabled?'Disable voice':'Enable voice'}</button>{enabled&&<button className={`push-talk ${talking?'talking':''}`} aria-label="Hold to talk" aria-pressed={talking} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);speak();}} onPointerUp={mute} onPointerCancel={mute} onLostPointerCapture={mute} onKeyDown={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();speak();}}} onKeyUp={mute} onBlur={mute}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" fill="none" stroke="currentColor" strokeWidth="2"/></svg><span>{talking?'Talking':'Hold T / hold mic'}</span></button>}{error&&<div className="voice-error" role="alert">{error}<button onClick={()=>{for(const p of state.current.peers.values())void p.audio.play().catch(()=>{});setError('');}}>Resume audio</button></div>}</section>;
}
