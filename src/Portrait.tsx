import type {Role} from '../server/roles';
const classic=['Duke','Assassin','Captain','Ambassador','Contessa'];
const vintage=['Merchant','Bandit','Guardian'];
/** A viewBox isolates one sprite panel; slice uses one uniform scale, never stretches the cat. */
export function Portrait({role,className='',decorative=false}:{role:Role;className?:string;decorative?:boolean}){
 const index=classic.indexOf(role),isClassic=index>=0;
 const panelWidth=isClassic?434.4:320,height=isClassic?724:640;
 const offset=(isClassic?index:vintage.indexOf(role))*panelWidth;
 return <svg role={decorative?undefined:"img"} aria-hidden={decorative||undefined} aria-label={decorative?undefined:`${role} cat portrait`} className={`portrait ${isClassic?"classic-portrait":"vintage-portrait"} ${className}`} viewBox={`${offset} 0 ${panelWidth} ${height}`} preserveAspectRatio="xMidYMin slice"><image aria-hidden="true" href={isClassic?'/assets/cat-court-lossless.webp':'/assets/vintage-court.webp'} width={isClassic?2172:960} height={height}/></svg>;
}
