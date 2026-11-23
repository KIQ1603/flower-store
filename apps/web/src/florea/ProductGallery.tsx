import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { ProductImage } from "./ProductCard";
import { Lightbox } from "./previewKit";
import { cn } from "../utils/cn";

/**
 * Thư viện ảnh sản phẩm: ảnh chính vuông ở trên, dải ảnh nhỏ bên dưới (hiện 5 ảnh, có mũi tên cuộn).
 * Bấm hoặc rê chuột vào ảnh nhỏ để đổi ảnh chính, bấm ảnh chính để phóng to, vuốt/phím mũi tên để chuyển ảnh.
 */
export function ProductGallery({ images, name, badge, heart }: { images: string[]; name: string; badge?: string | null; heart?: ReactNode }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const n = images.length; const first = images[0];
  useEffect(() => { setI(0); }, [first, n]); // đổi sản phẩm thì về ảnh đầu

  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  const measure = useCallback(() => {
    const el = strip.current; if (!el) return;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure(); const el = strip.current; if (!el) return;
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [measure, n]);
  // Giữ ảnh nhỏ đang chọn luôn nằm trong dải
  useEffect(() => { strip.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); }, [i]);
  const scrollStrip = (d: number) => strip.current?.scrollBy({ left: d * strip.current.clientWidth * 0.8, behavior: "smooth" });

  if (!n) return <ProductImage images={[]} alt={name} className="aspect-square w-full rounded-2xl" />;
  const arrow = "absolute top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-[15px] text-white backdrop-blur-sm transition hover:bg-black/65";

  return (
    <div className="w-full" role="group" aria-label="Thư viện ảnh sản phẩm" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } else if (e.key === "ArrowRight") { e.preventDefault(); go(1); } }}>
      <div className="group relative overflow-hidden rounded-2xl bg-cream-2 ring-1 ring-line/60"
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => { const s = start.current; start.current = null; if (s && n > 1 && Math.abs(e.clientX - s.x) > 45 && Math.abs(e.clientX - s.x) > Math.abs(e.clientY - s.y) * 1.5) go(e.clientX < s.x ? 1 : -1); }}>
        <button type="button" onClick={() => setZoom(i)} aria-label="Phóng to ảnh" className="block w-full cursor-zoom-in">
          <ProductImage key={i} images={[images[i]]} priority alt={`${name} – ảnh ${i + 1}`} sizes="(min-width:1024px) 460px, 100vw" className="aspect-square w-full" />
        </button>
        {badge && <span className="absolute top-3 left-3 rounded-full bg-[#f08ca7] px-3.5 py-1 text-[13px] font-bold text-white shadow-sm">{badge}</span>}
        {heart && <div className="absolute top-3 right-3">{heart}</div>}
        {n > 1 && (<>
          <button type="button" onClick={() => go(-1)} aria-label="Ảnh trước" className={cn(arrow, "left-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100")}><LeftOutlined aria-hidden /></button>
          <button type="button" onClick={() => go(1)} aria-label="Ảnh sau" className={cn(arrow, "right-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100")}><RightOutlined aria-hidden /></button>
          <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[12.5px] font-bold text-white" aria-live="polite" data-testid="gallery-count">{i + 1}/{n}</span>
        </>)}
      </div>

      {n > 1 && (
        <div className="relative mt-2.5">
          <div ref={strip} onScroll={measure} role="tablist" aria-label="Ảnh sản phẩm" className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((u, k) => (
              <button key={u + k} data-i={k} type="button" role="tab" aria-selected={i === k} aria-label={`Xem ảnh ${k + 1}`} onClick={() => setI(k)} onMouseEnter={(e) => { if (window.matchMedia("(hover: hover)").matches) setI(k); void e; }}
                className={cn("aspect-square w-[calc((100%-0.5rem*4)/5)] shrink-0 snap-start overflow-hidden rounded-lg border-2 bg-cream-2 transition", i === k ? "border-rose-deep" : "border-transparent opacity-80 hover:opacity-100")}>
                <ProductImage images={[u]} alt="" sizes="96px" className="h-full w-full" />
              </button>
            ))}
          </div>
          {edge.left && <button type="button" onClick={() => scrollStrip(-1)} aria-label="Cuộn ảnh nhỏ sang trái" className={cn(arrow, "left-1 h-8 w-8")}><LeftOutlined aria-hidden /></button>}
          {edge.right && <button type="button" onClick={() => scrollStrip(1)} aria-label="Cuộn ảnh nhỏ sang phải" className={cn(arrow, "right-1 h-8 w-8")}><RightOutlined aria-hidden /></button>}
        </div>
      )}
      {zoom !== null && <Lightbox images={images} start={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
