import { Ban } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { openBotChat } from "@/lib/telegram";

export default function Banned() {
  const { player } = usePlayer();
  return (
    <div className="flex flex-col items-center justify-center text-center px-6"
      style={{ minHeight: "var(--app-vh, 100dvh)", background: "linear-gradient(180deg,#0a1726,#12263c)" }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: "linear-gradient(145deg,#7f1d1d,#dc2626)", boxShadow: "0 12px 32px rgba(220,38,38,0.45)" }}>
        <Ban size={40} color="#fff" />
      </div>
      <h1 className="mt-5 text-2xl font-black" style={{ color: "#fff" }}>Ban qilingansiz</h1>
      <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.72)", maxWidth: 320 }}>
        Hisobingiz administrator tomonidan bloklangan. O'yinlarga va hisobingizga kirish mumkin emas.
      </p>
      {player?.telegramId && (
        <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>ID: {player.telegramId}</p>
      )}
      <button onClick={() => openBotChat("soqqa_admin")}
        className="mt-6 px-5 py-3 rounded-2xl font-black active:scale-95 transition-transform"
        style={{ background: "linear-gradient(145deg,#f7c948,#b45309)", color: "#1a1204" }}>
        Admin bilan bog'lanish
      </button>
    </div>
  );
}
