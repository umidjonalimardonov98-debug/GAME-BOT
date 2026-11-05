/**
 * LIVE sahnalar (2): chopayotgan ot va chavandoz, bilak kurashi stoli.
 * Faqat ko'rinish — natija serverda hisoblanadi.
 */

/** Chopayotgan ot + chavandoz. speed: 0 — turgan, 1 — to'liq chopish. */
export function Horse({ color = "#7c2d12", silk = "#ef4444", speed = 1, size = 90, num }: { color?: string; silk?: string; speed?: number; size?: number; num?: number }) {
  const dur = speed <= 0 ? 0 : Math.max(0.28, 0.7 - speed * 0.4);
  const st = { ["--gd" as any]: `${dur}s` } as React.CSSProperties;
  const run = dur > 0 ? "run" : "";
  return (
    <svg viewBox="0 0 120 80" width={size} height={size * 0.66} className={`ls-horse ${run}`} style={st} aria-hidden>
      <g className="ls-horse-body">
        {/* orqa oyoqlar */}
        <g className="ls-leg l1" style={{ transformOrigin: "34px 44px" }}><path d="M34 44 L30 60 L33 74" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" /><rect x="29" y="72" width="8" height="4" rx="1" fill="#111" /></g>
        <g className="ls-leg l3" style={{ transformOrigin: "84px 44px" }}><path d="M84 44 L88 60 L86 74" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" /><rect x="82" y="72" width="8" height="4" rx="1" fill="#111" /></g>
        {/* tana */}
        <path d="M26 30 Q22 24 14 30 Q20 30 22 36" fill="#1c1917" />
        <ellipse cx="58" cy="40" rx="34" ry="13" fill={color} />
        <path d="M84 34 Q94 18 100 14 L110 18 Q112 24 106 26 L98 28 Q92 38 88 44 Z" fill={color} />
        <path d="M86 30 Q92 16 100 12 L96 30 Z" fill="#1c1917" />
        <circle cx="104" cy="19" r="1.4" fill="#000" />
        {/* old oyoqlar */}
        <g className="ls-leg l2" style={{ transformOrigin: "38px 46px" }}><path d="M38 46 L42 60 L38 74" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" /><rect x="34" y="72" width="8" height="4" rx="1" fill="#111" /></g>
        <g className="ls-leg l4" style={{ transformOrigin: "80px 46px" }}><path d="M80 46 L76 60 L80 74" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" /><rect x="76" y="72" width="8" height="4" rx="1" fill="#111" /></g>
        {/* chavandoz */}
        <path d="M58 28 L66 12" stroke={silk} strokeWidth="9" strokeLinecap="round" />
        <path d="M64 16 L80 22" stroke="#d8a27a" strokeWidth="4" strokeLinecap="round" />
        <path d="M56 30 L62 40 L56 46" stroke="#f8fafc" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="68" cy="7" r="5.5" fill="#d8a27a" />
        <path d="M62 6 Q68 -1 74 6 Z" fill={silk} />
        <rect x="50" y="30" width="14" height="5" rx="2" fill={silk} opacity=".85" />
        {num !== undefined && <text x="44" y="44" fontSize="9" fontWeight="900" fill="#fff">{num}</text>}
      </g>
    </svg>
  );
}

/** Bilak kurashi: angle -1 (siz yutqazdingiz) .. 1 (raqib qo'li stolda). */
export function ArmWrestle({ angle, color, strain }: { angle: number; color: string; strain: boolean }) {
  const a = Math.max(-1, Math.min(1, angle)) * 70;
  const skin = "#d8a27a", foe = "#b9825c";
  return (
    <svg viewBox="0 0 320 180" className="ls-stage" aria-label="Bilak kurashi stoli">
      <rect width="320" height="180" fill="#0b0f19" />
      <ellipse cx="160" cy="30" rx="150" ry="70" fill="#fff" opacity=".06" />
      {/* raqib */}
      <circle cx="232" cy="52" r="20" fill={foe} /><path d="M212 50 Q232 24 252 50 Z" fill="#1f1308" />
      <path d="M200 140 Q232 80 266 140 Z" fill="#475569" />
      {/* siz */}
      <circle cx="88" cy="52" r="20" fill={skin} /><path d="M68 50 Q88 24 108 50 Z" fill="#1f1308" />
      <path d="M54 140 Q88 80 122 140 Z" fill={color} />
      {/* stol */}
      <rect x="20" y="128" width="280" height="14" rx="4" fill="#78350f" />
      <rect x="40" y="142" width="12" height="38" fill="#451a03" /><rect x="268" y="142" width="12" height="38" fill="#451a03" />
      {/* tirsaklar va qo'llar */}
      {(() => {
        const hx = 160 + Math.sin((a * Math.PI) / 180) * 58, hy = 126 - Math.cos((a * Math.PI) / 180) * 58;
        return (
          <g className={strain ? "ls-strain" : ""} strokeLinecap="round">
            <path d={`M70 112 L132 126 L${hx - 4} ${hy + 4}`} stroke={skin} strokeWidth="15" fill="none" strokeLinejoin="round" />
            <path d={`M250 112 L188 126 L${hx + 4} ${hy + 4}`} stroke={foe} strokeWidth="15" fill="none" strokeLinejoin="round" />
            <circle cx={hx} cy={hy} r="13" fill={skin} stroke={foe} strokeWidth="5" />
          </g>
        );
      })()}
      <circle cx="94" cy="52" r="2" fill="#111" /><circle cx="226" cy="52" r="2" fill="#111" />
    </svg>
  );
}
