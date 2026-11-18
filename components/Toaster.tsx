"use client";
import { useEffect, useState } from "react";
import { onToast, type Toast } from "@/lib/toast";
import { IconCheck, IconX } from "./icons";
import { useT } from "@/lib/i18n";

export default function Toaster({ raised = false }: { raised?: boolean }) {
  const tr = useT();
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => onToast((t) => {
    setItems((x) => [...x.slice(-2), t]);
    setTimeout(() => setItems((x) => x.filter((y) => y.id !== t.id)), t.ms ?? (t.action ? 5000 : 2600));
  }), []);
  const dismiss = (id: number) => setItems((x) => x.filter((y) => y.id !== id));
  return (
    <div className={`pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 ${raised ? "bottom-[100px] md:bottom-[112px]" : "bottom-[88px] md:bottom-6"}`} role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-[0_12px_32px_-12px_rgba(43,38,34,0.6)] ${t.tone === "celebrate" ? "bg-sage text-white" : "bg-ink text-cream"}`}>
          {t.tone === "success" && <IconCheck size={18} className="shrink-0 text-[#b9d0ad]" />}
          {t.tone === "celebrate" && <span aria-hidden>✦</span>}
          <span className="flex-1">{t.message}</span>
          {t.action && <button className="font-semibold underline underline-offset-4" onClick={() => { t.action!.run(); dismiss(t.id); }}>{t.action.label}</button>}
          <button onClick={() => dismiss(t.id)} aria-label={tr("discover.toast.dismiss")} className="opacity-70 hover:opacity-100"><IconX size={14} /></button>
        </div>
      ))}
    </div>
  );
}
