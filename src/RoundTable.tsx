import {Portrait} from './Portrait';
import {ROLES} from '../server/roles';
import type {CSSProperties} from 'react';
import type {View} from '../server/game';
export function RoundTable({game,me,seats}:{game:View;me:string;seats:{id:string;connected:boolean;bot?:boolean;voice?:boolean}[]}) {
  const index=game.players.findIndex(p=>p.id===me);
  const players=[...game.players.slice(index),...game.players.slice(0,index)];
  return <section className="round-table" aria-label="Circular game table"><div className="table-felt" aria-hidden="true"/><div className="table-center"><span className="table-wordmark">CAT<br/>COUP</span><span className="table-deck" aria-label={`${game.deckCount} cards in court`}>♠</span><small>{game.deckCount} in court · {game.treasury} coins</small><strong>{game.phase==='over'?'Court decided':`${game.players.find(p=>p.id===game.turn)?.name}'s turn`}</strong></div>{players.map((p,i)=>{
    const angle=(90+i*360/players.length)*Math.PI/180;
    const seat=seats.find(s=>s.id===p.id),alive=p.cards.some(c=>!c.revealed);
    return <article key={p.id} className={`table-seat ${p.id===me?'self':''} ${game.turn===p.id?'turn':''} ${!alive?'eliminated':''}`} style={{'--seat-x':`${50+37*Math.cos(angle)}%`,'--seat-y':`${50+30*Math.sin(angle)}%`} as CSSProperties} aria-label={`${p.name}${p.id===me?' (you)':''}, ${p.coins} coins${game.turn===p.id?', current turn':''}`}><Portrait role={ROLES[i%ROLES.length]} className="seat-avatar" decorative/><strong>{p.name}{p.id===me?' (you)':''}</strong><small>{!alive?'Eliminated':!seat?.connected?'Reconnecting':seat.bot?'Test bot':seat.voice?'Voice joined':'At the table'} <b>· {p.coins} coins</b></small><div className="table-influence">{p.cards.map((c,j)=><span className={c.revealed?'lost':''} key={j}>{c.revealed&&'role'in c?c.role:'♠'}</span>)}</div></article>;
  })}</section>;
}
