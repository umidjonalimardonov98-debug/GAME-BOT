import {it,expect} from "vitest";
import {cardMove,type MoveView} from "./durak-moves";
const c={r:9,s:"♥"} as const; const v:MoveView={started:true,myTurn:true,iAmAttacker:true,myHand:[c,{r:10,s:"♠"}],trump:"♠",table:[]};
it("one tap resolves directly to attack",()=>expect(cardMove(v,c)).toEqual({action:"attack"}));
it("one tap finds a beatable uncovered card",()=>expect(cardMove({...v,iAmDefender:true,table:[{a:{r:11,s:"♥"}},{a:{r:8,s:"♥"}}]},c)).toEqual({action:"defend",target:1}));
it("trump beats other suit but not higher trump",()=>{expect(cardMove({...v,iAmDefender:true,table:[{a:{r:14,s:"♥"}}]},{r:10,s:"♠"})).toEqual({action:"defend",target:0});expect(cardMove({...v,iAmDefender:true,table:[{a:{r:11,s:"♠"}}]},{r:10,s:"♠"})).toBeNull();});
it("blocks off-turn and invalid rank attacks",()=>{expect(cardMove({...v,myTurn:false},c)).toBeNull();expect(cardMove({...v,table:[{a:{r:8,s:"♥"},d:{r:10,s:"♥"}}]},c)).toBeNull();});
it("matches ranks on a covered table",()=>expect(cardMove({...v,table:[{a:{r:9,s:"♣"},d:{r:10,s:"♣"}}]},c)).toEqual({action:"attack"}));
it("blocks finished games and cards outside hand",()=>{expect(cardMove({...v,finished:true},c)).toBeNull();expect(cardMove(v,{r:14,s:"♦"})).toBeNull();});
