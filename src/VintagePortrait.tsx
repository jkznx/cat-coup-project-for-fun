import type {Role} from '../server/roles';
const portraits=['Merchant','Bandit','Guardian'];
export function VintagePortrait({role,className=''}:{role:Role;className?:string}){
 return <div role="img" aria-label={`${role} cat portrait`} className={`portrait vintage-portrait ${className}`} style={{backgroundPosition:`${portraits.indexOf(role)*50}% center`}}/>;
}
