import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, subscribeSound, toggleSound } from "@/lib/sound";

export default function SoundToggle({ light }: { light?: boolean }) {
  const [on, setOn] = useState(isSoundEnabled());
  useEffect(() => subscribeSound(setOn), []);

  return (
    <button
      aria-label={on ? "Ovozni o'chirish" : "Ovozni yoqish"}
      onClick={() => setOn(toggleSound())}
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 active:scale-90 transition-transform"
      style={{
        background: on
          ? (light ? "rgba(99,102,241,0.12)" : "rgba(124,58,237,0.28)")
          : (light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.07)"),
        border: `1px solid ${light ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.12)"}`,
      }}
    >
      {on
        ? <Volume2 className="w-4 h-4" style={{ color: light ? "#4338ca" : "#c4b5fd" }} />
        : <VolumeX className="w-4 h-4" style={{ color: light ? "#6b7280" : "rgba(255,255,255,0.45)" }} />}
    </button>
  );
}
