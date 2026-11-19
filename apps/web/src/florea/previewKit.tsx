import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { CloseOutlined } from "@ant-design/icons";

export type PreviewImage = { id: string; owner: "ADMIN" | "CUSTOMER"; url: string; takenAt: string };
export type PreviewRound = { id: string; roundNo: number; status: "PENDING" | "APPROVED" | "REVISION_REQUESTED" | "AUTO_APPROVED"; adminNote: string | null; customerNote: string | null; submittedAt: string; expiresAt: string; decidedAt: string | null; images: PreviewImage[] };
export type PreviewSnapshot = { orderStatus: string; skipPreview: boolean; maxRevisions: number; revisionsUsed: number; revisionsLeft: number; serverTime: string; currentId: string | null; rounds: PreviewRound[] };

/** Đếm ngược tới hạn, dùng giờ máy chủ để không lệch khi đồng hồ máy khách sai */
export function useCountdown(expiresAt: string | null | undefined, serverTime?: string) {
  const offset = useRef(0);
  useEffect(() => { offset.current = serverTime ? new Date(serverTime).getTime() - Date.now() : 0; }, [serverTime]);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) { setLeft(null); return; }
    const tick = () => setLeft(Math.max(0, new Date(expiresAt).getTime() - (Date.now() + offset.current)));
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [expiresAt, serverTime]);
  return left;
}
export const fmtLeft = (ms: number) => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${h ? h + ":" : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(x).padStart(2, "0")}`; };

/** Xem ảnh toàn màn hình: bấm vào ảnh để phóng to/thu nhỏ, mũi tên/phím ← → để chuyển ảnh, Esc để đóng */
export function Lightbox({ images, start, onClose }: { images: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start); const [zoom, setZoom] = useState(false);
  const go = (d: number) => { setI((x) => (x + d + images.length) % images.length); setZoom(false); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k); const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  });  
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/92" role="dialog" aria-modal="true" aria-label="Xem ảnh lớn" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <span className="text-[15px] font-bold">{i + 1}/{images.length} · bấm vào ảnh để {zoom ? "thu nhỏ" : "phóng to"}</span>
        <button onClick={onClose} aria-label="Đóng" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-xl hover:bg-white/25"><CloseOutlined aria-hidden /></button>
      </div>
      <div className={cn("relative flex-1 overflow-auto", zoom ? "cursor-zoom-out" : "grid cursor-zoom-in place-items-center")} onClick={(e) => { e.stopPropagation(); setZoom(!zoom); }}>
        <img src={images[i]} alt={`Ảnh ${i + 1}`} className={cn("select-none", zoom ? "m-auto max-w-none" : "max-h-full max-w-full object-contain")} style={zoom ? { width: "180%", maxWidth: "none" } : undefined} draggable={false} />
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-3 px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => go(-1)} aria-label="Ảnh trước" className="h-12 w-16 rounded-full bg-white/15 text-xl text-white hover:bg-white/25">‹</button>
          <button onClick={() => go(1)} aria-label="Ảnh sau" className="h-12 w-16 rounded-full bg-white/15 text-xl text-white hover:bg-white/25">›</button>
        </div>
      )}
    </div>
  );
}
