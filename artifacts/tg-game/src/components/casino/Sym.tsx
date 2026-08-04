/** Haqiqiy 3D rasm belgilar — emoji o'rniga (1win uslubi) */
const URL: Record<string, string> = {
  gem: "/symbols/gem.png", bomb: "/symbols/bomb.png", boom: "/symbols/boom.png",
  coin: "/symbols/coin.png", coin1: "/symbols/coin1.png", money: "/symbols/money.png",
  trophy: "/symbols/trophy.png", star: "/symbols/star.png", seven: "/symbols/seven.png",
  cherry: "/symbols/cherry.png", lemon: "/symbols/lemon.png", orange: "/symbols/orange.png",
  grape: "/symbols/grape.png", melon: "/symbols/melon.png", strawberry: "/symbols/strawberry.png",
  apple: "/symbols/apple.png", plane: "/symbols/plane.png", rocket: "/symbols/rocket.png",
  target: "/symbols/target.png", dice: "/symbols/dice.png", wheel: "/symbols/wheel.png",
  chest: "/symbols/chest.png", gift: "/symbols/gift.png", ticket: "/symbols/ticket.png",
  bell: "/symbols/bell.png", clover: "/symbols/clover.png", crown: "/symbols/crown.png",
  dragon: "/symbols/dragon.png", tiger: "/symbols/tiger.png", rock: "/symbols/rock.png",
  paper: "/symbols/paper.png", scissors: "/symbols/scissors.png", skull: "/symbols/skull.png",
  question: "/symbols/question.png", chip: "/symbols/chip.png", cardback: "/symbols/cardback.png",
  "medal-gold": "/symbols/medal-gold.png", "medal-silver": "/symbols/medal-silver.png",
  "medal-bronze": "/symbols/medal-bronze.png",
};

export function symUrl(n: string) { return URL[n] ?? ""; }

interface Props { n: string; s?: number; className?: string; style?: React.CSSProperties; glow?: boolean; }

export default function Sym({ n, s = 32, className, style, glow }: Props) {
  const src = URL[n];
  if (!src) return null;
  return (
    <img
      src={src} alt={n} width={s} height={s} loading="lazy" draggable={false}
      className={className}
      style={{
        width: s, height: s, objectFit: "contain", display: "inline-block", verticalAlign: "middle",
        filter: glow ? "drop-shadow(0 0 10px rgba(251,191,36,.65))" : "drop-shadow(0 3px 6px rgba(0,0,0,.45))",
        ...style,
      }}
    />
  );
}
