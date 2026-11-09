import type { CSSProperties } from "react";
import deckAsset from "@/assets/classic-deck.webp.asset.json";
import "@/playing-cards.css";
export type Suit = "♠" | "♥" | "♦" | "♣";
const PATHS: Record<Suit, string> = {
  "♥": "M50 88C22 68 8 52 8 35 8 21 19 11 32 11c8 0 14 4 18 10 4-6 10-10 18-10 13 0 24 10 24 24 0 17-14 33-42 53z",
  "♦": "M50 6 92 50 50 94 8 50z",
  "♠": "M50 6c14 16 38 30 38 49 0 12-9 20-20 20-6 0-11-2-14-6 1 9 4 16 9 21H37c5-5 8-12 9-21-3 4-8 6-14 6-11 0-20-8-20-20C12 36 36 22 50 6z",
  "♣": "M43 92c5-6 7-13 7-21-4 5-10 8-17 8-12 0-21-9-21-21 0-11 8-19 18-20-2-3-3-7-3-11 0-13 10-23 23-23s23 10 23 23c0 4-1 8-3 11 10 1 18 9 18 20 0 12-9 21-21 21-7 0-13-3-17-8 0 8 2 15 7 21z",
};

export function SuitIcon({ suit, size, color }: { suit: Suit; size: number; color: string }) { return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true"><path d={PATHS[suit]} fill={color}/></svg>; }
const ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suits:Suit[]=["♠","♥","♦","♣"];
const deckUrl=new URL(deckAsset.url,"https://id-preview--d0baf9ab-b92f-476a-a628-0a27ee842759.lovable.app").href;
interface Props { suit:Suit; value:string; hidden?:boolean; w?:number; delay?:number; dim?:boolean }
export default function PlayingCard({suit,value,hidden,w=76,delay=0,dim}:Props) {
 const col=Math.max(0,ranks.indexOf(value)),row=Math.max(0,suits.indexOf(suit));
 const style:CSSProperties={width:w,animationDelay:`${delay}ms`,...(!hidden?{backgroundImage:`url("${deckUrl}")`,backgroundPosition:`${col/12*100}% ${row/3*100}%`}:{})};
 return <div role="img" aria-label={hidden?"Yopiq karta":`${value} ${suit}`} className={`card-deal playing-card ${hidden?"playing-back":"card-face playing-face"}`} data-dim={Boolean(dim)} style={style}>{hidden&&<SuitIcon suit="♠" size={w*.42} color="currentColor"/>}</div>;
}
