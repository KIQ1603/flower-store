import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { timeAgo, useNotifications } from "./notifications";
import { cn } from "../utils/cn";

/** Chuông thông báo cho giao diện khách */
export function NotificationBell() {
  const { items, unread, markRead, readAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen(!open)} aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ""}`} aria-expanded={open} className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-white/80 text-ink hover:border-rose">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
        {unread > 0 && <span data-testid="bell-count" className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-deep px-1 text-[11px] font-extrabold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Thông báo" className="fixed inset-x-3 top-[84px] z-[60] max-h-[70vh] overflow-hidden rounded-3xl border border-line bg-white shadow-[0_30px_70px_-30px_rgba(62,45,38,0.5)] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5"><b className="font-serif text-[18px]">Thông báo</b>{unread > 0 && <button onClick={readAll} className="text-[13px] font-bold text-rose-deep underline">Đánh dấu đã đọc hết</button>}</div>
          <ul className="max-h-[calc(70vh-56px)] overflow-y-auto">
            {items.length === 0 && <li className="px-5 py-10 text-center text-ink-soft">Chưa có thông báo nào </li>}
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => { markRead(n.id); setOpen(false); nav(n.link); }} className={cn("block w-full border-b border-line/60 px-5 py-3.5 text-left hover:bg-cream", !n.readAt && "bg-rose-mist/60")}>
                  <span className="flex items-start gap-2.5"><span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-rose-deep")} aria-hidden /><span className="min-w-0"><span className="block text-[15px] leading-snug font-bold">{n.title}</span><span className="mt-0.5 block text-[13.5px] leading-snug text-ink-soft">{n.body}</span><span className="mt-1 block text-[12px] text-ink-faint">{timeAgo(n.createdAt)}</span></span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
