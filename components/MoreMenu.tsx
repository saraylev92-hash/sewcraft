"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconMore } from "./icons";
import { useT } from "@/lib/i18n";

type Item = { label: string; icon?: React.ReactNode; href?: string; run?: () => void };

/** Accessible overflow menu: button + popover list, closes on outside click / Escape. */
export default function MoreMenu({ items, label }: { items: Item[]; label?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const cls = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm hover:bg-beige focus:bg-beige";
  return (
    <div ref={ref} className="relative">
      <button className="btn btn-secondary !px-3.5" aria-haspopup="menu" aria-expanded={open} aria-label={label ?? t("discover.more.label")} onClick={() => setOpen((o) => !o)}><IconMore size={20} /></button>
      {open && (
        <div role="menu" className="toast-in absolute end-0 top-full z-30 mt-2 w-56 rounded-2xl border border-line bg-paper p-1.5 shadow-[0_18px_40px_-18px_rgba(43,38,34,0.5)]">
          {items.map((it) => it.href
            ? <Link key={it.label} href={it.href} role="menuitem" className={cls} onClick={() => setOpen(false)}>{it.icon}{it.label}</Link>
            : <button key={it.label} role="menuitem" className={cls} onClick={() => { setOpen(false); it.run?.(); }}>{it.icon}{it.label}</button>)}
        </div>
      )}
    </div>
  );
}
