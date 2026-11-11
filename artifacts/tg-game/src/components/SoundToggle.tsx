import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, subscribeSound, toggleSound } from "@/lib/sound";

export default function SoundToggle(_props: { light?: boolean }) {
  const [on, setOn] = useState(isSoundEnabled());
  useEffect(() => subscribeSound(setOn), []);

  return (
    <button
      type="button"
      aria-label={on ? "Ovozni o'chirish" : "Ovozni yoqish"}
      aria-pressed={on}
      data-sfx="none"
      onClick={() => setOn(toggleSound())}
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform"
      style={{
        background: on
          ? "linear-gradient(180deg, oklch(.95 .07 92), oklch(.84 .13 86) 45%, oklch(.62 .13 70))"
          : "oklch(.2 .015 60)",
        border: `1px solid ${on ? "oklch(.5 .1 65)" : "oklch(.42 .06 80 / .45)"}`,
        boxShadow: on ? "0 3px 0 oklch(.45 .09 65)" : "none",
      }}
    >
      {on
        ? <Volume2 className="w-4 h-4" style={{ color: "oklch(.2 .04 65)" }} />
        : <VolumeX className="w-4 h-4" style={{ color: "oklch(.74 .03 80)" }} />}
    </button>
  );
}
