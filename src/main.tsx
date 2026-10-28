import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import gsap from 'gsap';
import '@fontsource/geist/400.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist/800.css';
import type { Action, Role, Command, View, Card, Mode } from '../server/game';
import {descriptions, modeRoles, blockRoles, ACTIONS} from '../server/roles';
import {VintagePortrait} from './VintagePortrait';
import './style.css';
import {RoundTable} from './RoundTable';
import {VoiceChat} from './VoiceChat';
import './table-voice.css';

const roles: Role[] = ['Duke','Assassin','Captain','Ambassador','Contessa'];
const actions: {id:Action; label:string; detail:string; role?:Role; cost:number; targeted?:boolean}[] = [
  {id:'income',label:'Income',detail:'Take 1 coin',cost:0},
  {id:'aid',label:'Foreign aid',detail:'Take 2 · Duke can block',cost:0},
  {id:'coup',label:'Coup',detail:'Remove 1 influence · cannot block',cost:7,targeted:true},
  {id:'tax',label:'Tax',detail:'Take 3 coins',role:'Duke',cost:0},
  {id:'assassinate',label:'Assassinate',detail:'Remove 1 influence',role:'Assassin',cost:3,targeted:true},
  {id:'steal',label:'Steal',detail:'Take up to 2 from a rival',role:'Captain',cost:0,targeted:true},
  {id:'exchange',label:'Exchange',detail:'Draw 2 and choose what to keep',role:'Ambassador',cost:0},
  {id:'market',label:'Market',detail:'Take 2 coins · cannot be blocked',role:'Merchant',cost:0},
  {id:'plunder',label:'Plunder',detail:'Steal up to 3 · Guardian can block',role:'Bandit',cost:1,targeted:true},
];
interface Room { mode:Mode; code:string; host:string; me:string; draining?:boolean; seats:{id:string;name:string;ready:boolean;connected:boolean;bot?:boolean;voice?:boolean}[]; game:View|null }
interface Session {code:string;token:string;name:string}
type Reply = {ok:boolean;error?:string} & Partial<Session>;
const socket = io({autoConnect:false});
function saved():Session|null { try { return JSON.parse(sessionStorage.getItem('cat-coup-session') || 'null'); } catch { return null; } }
function remember(s:Session|null) { try { if(s) sessionStorage.setItem('cat-coup-session',JSON.stringify(s)); else sessionStorage.removeItem('cat-coup-session'); } catch { /* The active connection still works without storage. */ } }
function CatMark() { return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 22 8 7l13 9h6L40 7l-1 15c8 21-38 21-30 0Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="m18 26 2 1m8 0 2-1m-8 6 2 2 2-2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>; }
function Portrait({role,className=''}:{role:Role;className?:string}) { return roles.includes(role)?<div role="img" aria-label={`${role} cat portrait`} className={`portrait ${className}`} style={{backgroundPosition:`${roles.indexOf(role)*25}% center`}}/>:<VintagePortrait role={role} className={className}/>; }
function Influence({card,hidden=false,select,onSelect}:{card:{role?:Role;id?:string;revealed:boolean};hidden?:boolean;select?:boolean;onSelect?:()=>void}) {
  const content= <><div className="card-art">{card.role && !hidden ? <Portrait role={card.role}/> : <div className="card-back"><CatMark/><span>CAT COUP</span></div>}</div><div className="card-caption"><strong>{card.role && !hidden ? card.role : 'Secret influence'}</strong><small>{card.revealed?'Revealed · out of play':select?'Selected to keep':card.role && !hidden ? descriptions[card.role]:'Only its owner knows.'}</small></div></>;
  return onSelect ? <button className={`influence ${card.revealed?'revealed':''} ${select?'selected':''}`} onClick={onSelect} aria-pressed={select}>{content}</button> : <div className={`influence ${card.revealed?'revealed':''}`}>{content}</div>;
}
function App() {
  const [room,setRoom]=useState<Room|null>(null), [connected,setConnected]=useState(false), [busy,setBusy]=useState(false);
  const [name,setName]=useState(saved()?.name || ''), [code,setCode]=useState(new URLSearchParams(location.search).get('room') || '');
  const [error,setError]=useState(''), [notice,setNotice]=useState(''), [target,setTarget]=useState(''), [chosen,setChosen]=useState<string[]>([]), [hide,setHide]=useState(false);
  const help=useRef<HTMLDialogElement>(null), root=useRef<HTMLDivElement>(null);
  const game=room?.game, me=game?.players.find(p=>p.id===room?.me);
  useEffect(()=>{
    const connect=()=>{ setConnected(true); setError(''); const session=saved(); if(session) socket.timeout(6000).emit('resume',session,(err:Error|null,r:Reply)=>{if(err){setError('Could not restore your seat. Reconnect to try again.');}else if(!r.ok){remember(null);setRoom(null);setError(r.error || 'Session expired.');}}); };
    const disconnect=()=>setConnected(false);
    socket.on('connect',connect).on('disconnect',disconnect).on('room',setRoom).on('connect_error',()=>setError('The game server is unreachable. Keep this page open to reconnect.'));
    socket.connect(); return ()=>{socket.removeAllListeners();socket.disconnect();};
  },[]);
  useEffect(()=>{setChosen([]);setTarget('');},[game?.revision]);
  useEffect(()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx=gsap.context(()=>{
      gsap.fromTo('.hero-fan .influence',{y:28,opacity:0.65},{y:0,opacity:1,duration:0.65,stagger:0.09,ease:'power3.out'});
      gsap.fromTo('.decision',{y:8},{y:0,duration:0.25,ease:'power3.out'});
    },root); return ()=>ctx.revert();
  },[!!room,game?.phase]);
  const request=(event:string,data:unknown={},done?:(r:Reply)=>void)=>{
    if(busy || !connected)return; setBusy(true);setError('');setNotice('');
    socket.timeout(6000).emit(event,data,(err:Error|null,r:Reply)=>{setBusy(false);if(err)setError('No reply yet. Check the table before trying again.');else if(!r.ok)setError(r.error || 'Request not accepted.');else done?.(r);});
  };
  const enter=(join:boolean)=>request('enter',{name,code:join?code.trim().toUpperCase():undefined},r=>remember({code:r.code!,token:r.token!,name:r.name!}));
  const move=(command:Command)=>request('move',{revision:game?.revision,command});
  const displayName=(id?:string)=>room?.seats.find(p=>p.id===id)?.name || 'A cat';
  const paused=game && room!.seats.some(s=>!s.connected&&game.players.find(p=>p.id===s.id)?.cards.some(c=>!c.revealed));
  const disabled=busy || !connected || !!paused;
  const active=!!me?.cards.some(c=>!c.revealed);
  const yourTurn=game?.phase==='action'&&game.turn===room?.me;
  const responding=game?.responders.includes(room?.me || '');
  const exchange=game?.phase==='exchange'&&game.pending?.actor===room?.me;
  const losing=game?.phase==='loss'&&game.lossPlayer===room?.me;
  const keep=me?.cards.filter(c=>!c.revealed).length || 0;
  const title=game?.phase==='over'?`${displayName(game.winner)} wins the court.`:paused?'Waiting for a cat to reconnect.':losing?'Choose one influence to reveal.':exchange?`Choose ${keep} cards to keep.`:yourTurn?'Your move. Make it convincing.':responding?(game?.phase==='block'?'Let it through, or block?':'Believe the claim, or challenge?'):`Waiting for ${game?.phase==='loss'?displayName(game.lossPlayer):game?.phase==='exchange'?displayName(game.pending?.actor):game?.phase==='action'?displayName(game.turn):'the other cats'}…`;
  const share=async()=>{try{await navigator.clipboard.writeText(`${location.origin}/?room=${room!.code}`);setNotice('Invite link copied.');}catch{setNotice(`Share this room code: ${room!.code}`);}};
  return <div ref={root} className={`app ${room?.mode==='vintage'?'vintage':''}`}>
    <header className="topbar"><a className="brand" href="/" onClick={e=>{if(room)e.preventDefault();}}><CatMark/><span>CAT COUP<span className="brand-dot">.</span></span></a><div className="nav-right"><span className={`connection ${connected?'online':''}`}>{connected?'Table server connected':'Connecting…'}</span><button className="quiet" onClick={()=>help.current?.showModal()}>How to play</button></div></header>
    {error && <div role="alert" className="alert">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}>Dismiss</button></div>}
    {notice && <div role="status" className="notice">{notice}</div>}
    {room && !game && room.host===room.me && <div className="notice"><span>Practice with test bots. Bots are ready automatically and use their own private hand.</span><div><button className="secondary" disabled={disabled||room.draining||room.seats.length>=6} onClick={()=>request('add-bot')}>Add test bot</button>{room.seats.some(s=>s.bot)&&<button className="quiet" disabled={disabled} onClick={()=>request('remove-bot',{id:room.seats.filter(s=>s.bot).at(-1)!.id})}>Remove a bot</button>}</div></div>}
    {room && <VoiceChat key={room.code+room.me} socket={socket} room={room}/>}
    {room&&!game&&<section className="mode-panel" aria-label="Game mode"><fieldset disabled={disabled||room.draining||room.host!==room.me}><legend>Choose your court</legend><div className="mode-options">{(['classic','vintage'] as const).map(mode=><label className={`mode-option ${room.mode===mode?'selected':''}`} key={mode}><input type="radio" name="mode" value={mode} checked={room.mode===mode} onChange={()=>request('set-mode',{mode})}/><span><strong>{mode==='classic'?'Classic':'Vintage'} <small>{mode==='classic'?'5 roles · 15 cards':'8 roles · 24 cards'}</small></strong><span>{mode==='classic'?'The original five. Pure bluffing.':'A larger court: Merchant, Bandit and Guardian.'}</span></span></label>)}</div></fieldset><p>{room.host===room.me?'Changing mode resets human players’ ready status.':'The host chooses the mode before dealing.'} Vintage is a Cat Coup house variant.</p>{room.mode==='vintage'&&<div className="vintage-preview">{(['Merchant','Bandit','Guardian'] as const).map(role=><article key={role}><Portrait role={role}/><div><h3>{role}</h3><p>{descriptions[role]}</p></div></article>)}</div>}</section>}
    {room?.draining && <div role="status" className="notice">An update is pending. Current games can finish; new games are paused. Lobby rooms will reset when the update begins.</div>}
    {!room ? <main className="welcome">
      <section className="intro"><h1>Nine lives.<br/><span>Two secrets.</span></h1><p>A court of cunning cats. Bluff, steal, and outwit your friends. Only one gets the crown.</p><div className="hero-fan" aria-label="The five cat characters">{roles.map((role,i)=><div className={`fan-card fan-${i}`} key={role}><Influence card={{role,revealed:false}}/></div>)}</div><p className="table-note">2–6 friends <span>·</span> Private rooms <span>·</span> A very suspicious amount of purring</p></section>
      <section className="entry"><div className="entry-top"><span className="line-art"><CatMark/></span><h2>Pull up a chair.</h2><p>Bring your friends. Leave your poker face on.</p></div><form onSubmit={(e:FormEvent)=>{e.preventDefault();enter(true);}}><label htmlFor="name">Your nickname</label><input id="name" autoComplete="nickname" maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sir Pounce" required/><button className="primary create" type="button" disabled={!connected||busy||!name.trim()} onClick={()=>enter(false)}>{busy?'Taking your seat…':'Create a room'}<span aria-hidden="true">→</span></button><div className="or"><span/>or join your friends<span/></div><label htmlFor="code">Room code</label><div className="join-row"><input id="code" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))} placeholder="ABC123" maxLength={6} minLength={6} autoComplete="off" required/><button className="secondary" disabled={!connected||busy||code.length!==6||!name.trim()}>Join room</button></div></form><p className="entry-note">No account needed. Your hand stays private.</p></section>
      <section className="rule-teaser"><div><h2>Appearances are deceiving.</h2><p>You may claim any character. But if another cat calls your bluff, you’ll need to prove it.</p></div><button className="quiet" onClick={()=>help.current?.showModal()}>Meet the characters <span aria-hidden="true">↗</span></button></section>
    </main> : !game ? <main className="lobby"><div className="room-heading"><div><h1>Your table is waiting.</h1><p>Share the room code, then have everyone ready up.</p></div><button className="room-code" onClick={share} title="Copy invite link"><small>ROOM CODE</small><strong>{room.code}</strong><span>Copy invite link</span></button></div><div className="seats">{Array.from({length:6},(_,i)=>{const s=room.seats[i];return <article className={`seat ${s?'occupied':''}`} key={i}>{s?<><Portrait role={roles[i%5]}/><h2>{s.name}{s.id===room.me?' (you)':''}</h2><p>{s.id===room.host?'Host · ':''}{!s.connected?'Disconnected':s.ready?'Ready to play':'Getting comfortable'}</p></>:<><div className="empty-seat"><CatMark/></div><h2>Open seat</h2><p>Invite another cat</p></>}</article>;})}</div><div className="lobby-actions"><button className="primary" disabled={disabled} onClick={()=>request('ready')}>{room.seats.find(s=>s.id===room.me)?.ready?'Not ready':'I’m ready'}</button>{room.me===room.host&&<button className="secondary" disabled={disabled||room.seats.length<2||!room.seats.every(s=>s.ready&&s.connected)} onClick={()=>request('start')}>Deal the cards</button>}<button className="quiet" disabled={busy} onClick={()=>request('leave',{},()=>{setRoom(null);remember(null);})}>Leave room</button></div><p className="fine">The host deals when all players are ready. Keep this browser tab to reconnect to your seat.</p></main> : <main className="game">
      <div className="game-top"><span>{game.mode==='vintage'?'Vintage · 8 roles':'Classic · 5 roles'} · Room <button className="inline-code" onClick={share}>{room.code}</button></span><span>{game.deckCount} cards in court · {game.treasury} coins in treasury</span></div>
      <RoundTable game={game} me={room.me} seats={room.seats}/>
      <section className="decision" aria-labelledby="decision-title"><div className="decision-copy" aria-live="polite"><h1 id="decision-title">{title}</h1>{game.pending&&<p><strong>{displayName(game.pending.actor)}</strong> declared <strong>{actions.find(a=>a.id===game.pending!.action)?.label}</strong>{game.pending.target?` against ${displayName(game.pending.target)}`:''}.{game.pending.blocker&&` ${displayName(game.pending.blocker)} claims ${game.pending.blockRole} to block.`}</p>}{yourTurn&&<p>{(me?.coins||0)>=10?'You have 10 or more coins. You must launch a coup.':'Take an action below. Character actions can be bluffs.'}</p>}{losing&&<p>This card will be public and can no longer protect you.</p>}{!active&&game.phase!=='over'&&<p>You’re out, but you can watch the rest of the game.</p>}</div>
      {responding&&<div className="responses"><button className="secondary" disabled={disabled} onClick={()=>move({type:'pass'})}>{game.phase==='block'?'Allow action':game.phase==='blockClaim'?'Accept block':'Accept claim'}</button>{['claim','blockClaim'].includes(game.phase)&&<button className="danger" disabled={disabled} onClick={()=>move({type:'challenge'})}>Challenge claim</button>}{game.phase==='block'&&blockRoles(game.pending!.action,game.mode).map(role=><button className="primary" key={role} disabled={disabled} onClick={()=>move({type:'block',role:role as Role})}>Block as {role}</button>)}</div>}
      {game.phase==='over'&&<div className="responses">{room.host===room.me?<button className="primary" disabled={disabled} onClick={()=>request('rematch')}>Play again</button>:<p>Waiting for the host to open a rematch.</p>}<button className="quiet" onClick={()=>request('leave',{},()=>{setRoom(null);remember(null);})}>Leave table</button></div>}</section>
      <div className="play-area"><section className="your-hand"><div className="section-heading"><h2>Your influence</h2><span className="coins">{me?.coins} <small>coins</small></span><button className="quiet" onClick={()=>setHide(!hide)}>{hide?'Show cards':'Hide cards'}</button></div><div className="hand-cards">{(exchange?[...me!.cards.filter(c=>!c.revealed),...game.exchange!]:me!.cards).map((c,i)=><Influence key={'id' in c?String(c.id):i} card={c} hidden={hide&&!c.revealed} select={exchange&&chosen.includes((c as Card).id)} onSelect={disabled?undefined:losing&&!c.revealed?()=>move({type:'lose',card:(c as Card).id}):exchange?()=>setChosen(prev=>prev.includes((c as Card).id)?prev.filter(id=>id!==(c as Card).id):prev.length<keep?[...prev,(c as Card).id]:prev):undefined}/>)}</div>{exchange&&<button className="primary" disabled={disabled||chosen.length!==keep} onClick={()=>move({type:'exchange',cards:chosen})}>Keep {chosen.length} of {keep} selected cards</button>}</section>
      <section className="action-tray"><h2>{yourTurn?'Choose your action':'Actions at a glance'}</h2>{yourTurn&&<label className="target-label">Target for coup, assassination or theft<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choose an opponent</option>{game.players.filter(p=>p.id!==room.me&&p.cards.some(c=>!c.revealed)).map(p=><option value={p.id} key={p.id}>{p.name} · {p.coins} coins</option>)}</select></label>}<div className="actions">{actions.filter(a=>!ACTIONS[a.id].vintage||game.mode==='vintage').map(a=><button key={a.id} className={`action ${a.role?'role-action':''}`} disabled={disabled||!yourTurn||(me?.coins||0)<a.cost||((me?.coins||0)>=10&&a.id!=='coup')||!!(a.targeted&&!target)} onClick={()=>move({type:'action',action:a.id,target:a.targeted?target:undefined})}><span><strong>{a.label}</strong><small>{a.detail}</small></span><span className="action-meta">{a.role&&<small>{a.role}</small>}<b>{a.cost?`${a.cost} coins`:'Free'}</b></span></button>)}</div></section></div>
      <details className="history" open><summary>Table history</summary><ol>{[...game.log].reverse().map((entry,i)=><li key={`${game.log.length-i}-${entry}`}>{entry}</li>)}</ol></details>
    </main>}
    <footer><span>CAT COUP · A little charm. A lot of bluff.</span><a href="https://www.qugs.org/rules/r131357.pdf" target="_blank" rel="noreferrer">Based on Coup by Rikki Tahta · Rules ↗</a></footer>
    <dialog ref={help} className="rules" aria-labelledby="rules-title"><div className="section-heading"><h2 id="rules-title">Welcome to the cat court.</h2><button className="quiet" onClick={()=>help.current?.close()}>Close</button></div><p>Keep at least one hidden influence. If both are revealed, you’re out. The last cat with influence wins.</p><p><strong>{room?.mode==='vintage'?'Vintage: 8 roles, 24 cards. Cat Coup house variant.':'Classic: 5 roles, 15 cards.'}</strong> Three copies of each role; two influences per player. The host selects the mode in the lobby.</p><div className="role-guide">{modeRoles(room?.mode||'classic').map(role=><article key={role}><Portrait role={role}/><div><h3>{role}</h3><p>{descriptions[role]}</p></div></article>)}</div><h3>Vintage house rules</h3><p>Vintage keeps the Classic rules and adds Merchant (Market: take 2), Bandit (Plunder: pay 1, steal up to 3) and Guardian (block Steal or Plunder). Only the target may block theft. Plunder can only be blocked by Guardian. Role claims and blocks can be challenged, and a caught action bluff refunds its fee. More roles change the odds; this house variant has not been competitively balanced.</p><h3>A claim is not a confession.</h3><p>You can claim a character you don’t hold. Other players can accept or challenge. If proved, the challenger loses influence and the proven card is replaced. If caught bluffing, the claimant loses influence.</p><h3>Coins, coups and counterclaims</h3><p>Income is safe. Foreign aid can be blocked by Duke. A coup costs 7 and cannot be blocked; at 10 coins it is mandatory. Blocks can be bluffs too. Assassination costs 3 even when blocked; a caught action bluff refunds its fee.</p><p className="fine">Rooms live in server memory. A disconnected active player pauses the table until they return. Use the same tab to restore a seat; a server restart ends rooms. This is an independent fan project with original cat artwork.</p><a href="https://www.qugs.org/rules/r131357.pdf" target="_blank" rel="noreferrer">Read the full original rules ↗</a></dialog>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
