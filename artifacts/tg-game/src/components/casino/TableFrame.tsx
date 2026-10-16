import type { ReactNode, CSSProperties } from "react";

export type Skin = "gold" | "blue" | "green" | "night" | "forest" | "dragon";

interface Props {
  skin?: Skin;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  bulbs?: boolean;
  bulbsActive?: boolean;
  title?: string;
}

export default function TableFrame({ skin = "gold", children, className = "", style, bulbs, bulbsActive, title }: Props) {
  return (
    <div className={`arcade-table arcade-${skin} w-full relative ${className}`} style={style}>
      <div className="arcade-table-inner relative overflow-hidden p-3">
        {bulbs && (
          <div className={`arcade-lights ${bulbsActive ? "is-running" : ""}`} aria-hidden="true">
            {Array.from({ length: 13 }, (_, i) => <span key={i} />)}
          </div>
        )}
        {title && <div className="arcade-title mx-auto mb-3 w-fit px-5 py-2 text-center text-xs font-black">{title}</div>}
        {children}
      </div>
    </div>
  );
}
