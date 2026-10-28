export const ROLES = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'] as const;
export const VINTAGE_ROLES = [...ROLES, 'Merchant', 'Bandit', 'Guardian'] as const;
export type Role = typeof VINTAGE_ROLES[number];
export type Mode = 'classic' | 'vintage';
export const modeRoles = (mode:Mode): readonly Role[] => mode === 'vintage' ? VINTAGE_ROLES : ROLES;
export type Action = 'income' | 'aid' | 'tax' | 'steal' | 'assassinate' | 'exchange' | 'coup' | 'market' | 'plunder';
export const ACTIONS: Record<Action, {role?:Role;cost:number;targeted?:boolean;vintage?:boolean}> = {
  income:{cost:0}, aid:{cost:0}, tax:{role:'Duke',cost:0}, steal:{role:'Captain',cost:0,targeted:true},
  assassinate:{role:'Assassin',cost:3,targeted:true}, exchange:{role:'Ambassador',cost:0}, coup:{cost:7,targeted:true},
  market:{role:'Merchant',cost:0,vintage:true}, plunder:{role:'Bandit',cost:1,targeted:true,vintage:true},
};
export const descriptions:Record<Role,string> = {
  Duke:'Collect 3 coins. Block foreign aid.', Assassin:'Pay 3 coins to remove influence.',
  Captain:'Steal up to 2 coins. Block a steal.', Ambassador:'Draw 2, choose your hand. Block a steal.',
  Contessa:'Block an assassination.', Merchant:'Market: collect 2 coins. Can be challenged, not blocked.',
  Bandit:'Plunder: pay 1, steal up to 3 coins. Guardian can block.', Guardian:'Block a steal or plunder. No special action.',
};
export function blockRoles(action:Action,mode:Mode='classic'):Role[] {
  return action==='aid'?['Duke']:action==='steal'?['Captain','Ambassador',...(mode==='vintage'?['Guardian' as const]:[])]:action==='assassinate'?['Contessa']:action==='plunder'&&mode==='vintage'?['Guardian']:[];
}
