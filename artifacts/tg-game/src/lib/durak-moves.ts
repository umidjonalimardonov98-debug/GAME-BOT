export type Card={r:number;s:"♠"|"♥"|"♦"|"♣"};
export type MoveView={started:boolean;finished?:boolean;myTurn?:boolean;iAmAttacker?:boolean;iAmDefender?:boolean;trump?:Card["s"];myHand?:Card[];table?:{a:Card;d?:Card}[];foes?:{isDefender:boolean;cards:number}[]};
export function cardMove(v:MoveView|null,c:Card):{action:"attack"|"defend";target?:number}|null {
 if(!v?.started||v.finished||!v.myTurn||!v.myHand?.some(x=>x.r===c.r&&x.s===c.s)) return null;
 const t=v.table??[];
 if(v.iAmDefender){const target=t.findIndex(p=>!p.d&&(c.s===p.a.s?c.r>p.a.r:c.s===v.trump&&p.a.s!==v.trump));return target<0?null:{action:"defend",target};}
 if(!v.iAmAttacker||t.some(p=>!p.d)||t.length>=Math.min(6,(v.foes?.find(f=>f.isDefender)?.cards??6)+t.length))return null;
 if(t.length&&!t.some(p=>p.a.r===c.r||p.d?.r===c.r))return null;
 return {action:"attack"};
}
