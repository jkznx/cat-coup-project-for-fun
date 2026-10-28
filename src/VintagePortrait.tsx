import type {Role} from '../server/roles';
export function VintagePortrait({role,className=''}:{role:Role;className?:string}){
 const merchant=role==='Merchant',bandit=role==='Bandit';
 const color=merchant?'#c69748':bandit?'#8d5260':'#477b78';
 return <svg role="img" aria-label={`${role} cat portrait`} viewBox="0 0 180 220" className={`portrait vintage-portrait ${className}`}>
 <rect width="180" height="220" fill="#172e32"/><path d="M10 12h160v196H10z" fill="none" stroke={color} strokeWidth="2"/><circle cx="90" cy="94" r="65" fill={color} opacity=".22"/>
 <path d="M21 220q3-71 69-76 67 5 69 76" fill={color}/><path d="m42 93-5-60 39 30h28l39-30-5 60q9 62-48 62T42 93" fill={merchant?'#bd9b79':bandit?'#7e8185':'#d1bda0'} stroke="#dfc799" strokeWidth="2"/>
 {merchant?<path d="M48 54V28h84v26M32 55h116" stroke="#d8af64" strokeWidth="12" fill="none"/>:bandit?<path d="M40 80q50-22 100 0v24H40z" fill="#342b3e"/>:<path d="M39 65q0-52 51-52t51 52l-51-17z" fill="#749492" stroke="#c4b279" strokeWidth="3"/>}
 <path d="m57 94 15-3m36 0 15 3" stroke="#e8d26d" strokeWidth="5" strokeLinecap="round"/><path d="m83 117 7 5 7-5m-7 5v9m-26-13-24-4m24 13-24 5m76-14 24-4m-24 13 24 5" stroke="#372f31" strokeWidth="2" fill="none"/>
 <circle cx="90" cy="181" r="18" fill="#173238" stroke="#dfc799" strokeWidth="2"/><text x="90" y="188" textAnchor="middle" fill="#dfc799" fontSize="23" fontFamily="serif">{merchant?'M':bandit?'B':'G'}</text></svg>;
}
