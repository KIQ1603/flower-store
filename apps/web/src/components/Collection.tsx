import { useEffect, useRef, useState } from "react";
import { BloomMark, Icon, Stars } from "./Icons";
import { Reveal } from "./Reveal";
import { formatPrice, occasions, products, type Product } from "../data";
import { cn } from "../utils/cn";

type CollectionProps = {
  onAdd: (id: number) => void;
  onToggleWish: (id: number) => void;
  wishlist: number[];
  onConsult: () => void;
};

const SAKURA_HUE = 345;

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const backOut = (x: number) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);

function seeded(s: number) {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

function ProceduralBouquetCard({
  product,
  saved,
  added,
  onAdd,
  onToggleWish,
  onInspect,
}: {
  product: Product;
  saved: boolean;
  added: boolean;
  onAdd: () => void;
  onToggleWish: () => void;
  onInspect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const seed = product.id * 17 + 11;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;

    const W = 320;
    const H = 340;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * DPR;
    cv.height = H * DPR;

    const blossomSpr: HTMLCanvasElement[] = [];
    const petalSpr: HTMLCanvasElement[] = [];

    // Single signature pink (hue = 345) for all blossoms
    const Z = 56;
    for (let k = 0; k < 6; k++) {
      const c = document.createElement("canvas");
      c.width = Z;
      c.height = Z;
      const x = c.getContext("2d")!;
      const back = k >= 4;
      const rr = Z * 0.45;
      const L = back ? [58, 66][k - 4] : [84, 90, 78, 93][k];
      const sat = back ? 34 : [72, 78, 62, 66][k];
      x.translate(Z / 2, Z / 2);
      x.rotate(k);
      for (let i = 0; i < 5; i++) {
        x.save();
        x.rotate(i * 1.2566 + (i % 2) * 0.08);
        const gr = x.createRadialGradient(0, 0, 0, 0, -rr * 0.5, rr * 0.75);
        gr.addColorStop(0, hsl(SAKURA_HUE - 8, sat + 10, L - 22));
        gr.addColorStop(0.45, hsl(SAKURA_HUE, sat, L - 4));
        gr.addColorStop(1, hsl(SAKURA_HUE + 6, sat - 10, Math.min(98, L + 6)));
        x.fillStyle = gr;
        x.beginPath();
        x.moveTo(0, 0);
        x.bezierCurveTo(-rr * 0.62, -rr * 0.22, -rr * 0.66, -rr * 0.96, -rr * 0.14, -rr);
        x.lineTo(0, -rr * 0.86);
        x.lineTo(rr * 0.14, -rr);
        x.bezierCurveTo(rr * 0.66, -rr * 0.96, rr * 0.62, -rr * 0.22, 0, 0);
        x.fill();
        x.strokeStyle = hsl(SAKURA_HUE - 4, 40, back ? 36 : 58, 0.35);
        x.lineWidth = 1.1;
        x.stroke();
        x.restore();
      }
      x.fillStyle = hsl(SAKURA_HUE - 14, 70, back ? 28 : 40);
      x.beginPath();
      x.arc(0, 0, rr * 0.16, 0, 7);
      x.fill();
      for (let i = 0; i < 9; i++) {
        const a = i * 0.698;
        const l = rr * (0.3 + (i % 3) * 0.06);
        x.strokeStyle = hsl(SAKURA_HUE - 10, 50, back ? 40 : 62, 0.8);
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo(Math.cos(a) * l, Math.sin(a) * l);
        x.stroke();
        x.fillStyle = back ? "#9a7a6a" : "#f2d9a6";
        x.beginPath();
        x.arc(Math.cos(a) * l, Math.sin(a) * l, 1.4, 0, 7);
        x.fill();
      }
      blossomSpr.push(c);
    }

    for (let k = 0; k < 4; k++) {
      const c = document.createElement("canvas");
      c.width = 28;
      c.height = 28;
      const x = c.getContext("2d")!;
      const L = [88, 82, 92, 76][k];
      x.translate(14, 14);
      const gr = x.createLinearGradient(0, 11, 0, -11);
      gr.addColorStop(0, hsl(SAKURA_HUE - 8, 70, L - 16));
      gr.addColorStop(1, hsl(SAKURA_HUE + 4, 70, Math.min(97, L + 6)));
      x.fillStyle = gr;
      x.beginPath();
      x.moveTo(0, 11);
      x.bezierCurveTo(-9, 4, -8, -9, -2.5, -11);
      x.lineTo(0, -8.5);
      x.lineTo(2.5, -11);
      x.bezierCurveTo(8, -9, 9, 4, 0, 11);
      x.fill();
      petalSpr.push(c);
    }

    type BBranch = { pts: [number, number][]; cum: number[]; w0: number; w1: number; depth: number; t0: number; dur: number; tip: boolean };
    const branches: BBranch[] = [];
    const r = seeded(seed);

    function grow(x: number, y: number, a: number, len: number, w: number, depth: number, startT: number) {
      const n = 5;
      const pts: [number, number][] = [[x, y]];
      let ang = a;
      for (let i = 1; i < n; i++) {
        ang += (r() - 0.5) * 0.28;
        x += (Math.sin(ang) * len) / (n - 1);
        y -= (Math.cos(ang) * len) / (n - 1);
        pts.push([x, y]);
      }
      const w1 = w * 0.72;
      const dur = 0.26;
      const b: BBranch = { pts, cum: [0], w0: w, w1, depth, t0: startT, dur, tip: false };
      for (let i = 1; i < pts.length; i++) {
        b.cum.push(b.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      }
      branches.push(b);
      if (depth >= 5) {
        b.tip = true;
        return;
      }
      const kids = depth < 2 ? 3 : 2;
      const spread = 0.42 + r() * 0.25;
      for (let k = 0; k < kids; k++) {
        const side = kids === 2 ? (k ? 1 : -1) : k - 1;
        grow(x, y, ang + side * spread * (0.75 + r() * 0.4), len * 0.74, w1 * 0.78, depth + 1, startT + dur * 0.85);
      }
    }

    grow(160, 242, 0, 54, 9, 0, 0.05);

    type BBlossom = {
      x: number;
      y: number;
      size: number;
      rot: number;
      back: boolean;
      v: number;
      al: number;
      pop: number;
      hp: number;
      regrowAt: number;
    };
    const blossoms: BBlossom[] = [];
    const host = branches.filter((b) => b.depth >= 2);
    for (let i = 0; i < 620; i++) {
      const b = host[(r() * host.length) | 0];
      const pt = b.pts[(r() * b.pts.length) | 0];
      const spread = 12 + b.depth * 4.5;
      const gx = (r() + r() - 1) * spread;
      const gy = (r() + r() - 1) * spread;
      blossoms.push({
        x: pt[0] + gx,
        y: pt[1] + gy - 6,
        size: 5.5 + Math.pow(r(), 1.4) * 7.5,
        rot: r() * 6.28,
        back: r() < 0.35,
        v: (r() * 4) | 0,
        al: 0.78 + r() * 0.22,
        pop: b.t0 + b.dur + Math.pow(r(), 1.3) * 0.85,
        hp: 3,
        regrowAt: 0,
      });
    }
    blossoms.sort((a, b) => (a.back === b.back ? a.y - b.y : a.back ? -1 : 1));

    type FlyPetal = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; fl: number; fs: number; size: number; spr: number; al: number };
    const flying: FlyPetal[] = [];

    let t0: number | null = null;
    let curT = 0;
    let raf = 0;
    const ptr = { x: 0, y: 0, px: 0, py: 0, active: false };

    const shed = (f: BBlossom, vx: number, vy: number) => {
      if (f.hp <= 0) return;
      f.hp--;
      f.regrowAt = curT + 1.4 + Math.random() * 1.3;
      flying.push({
        x: f.x,
        y: f.y,
        vx: vx + (Math.random() - 0.5) * 45,
        vy: vy - 10 + Math.random() * 25,
        rot: Math.random() * 6.28,
        spin: (Math.random() - 0.5) * 5,
        fl: Math.random() * 6.28,
        fs: 4 + Math.random() * 4,
        size: 5 + Math.random() * 3,
        spr: (Math.random() * 4) | 0,
        al: 1,
      });
    };

    const onMove = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / rect.width) * W;
      const cy = ((e.clientY - rect.top) / rect.height) * H;
      if (ptr.active) {
        const vx = (cx - ptr.px) * 14;
        const vy = (cy - ptr.py) * 14;
        if (Math.hypot(vx, vy) > 20) {
          for (const f of blossoms) {
            if (f.hp > 0 && Math.hypot(f.x - cx, f.y - cy) < 42 && Math.random() < 0.25) {
              shed(f, vx * 0.35, vy * 0.25);
            }
          }
        }
      }
      ptr.px = cx;
      ptr.py = cy;
      ptr.active = true;
    };

    const onLeave = () => {
      ptr.active = false;
    };

    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (t0 === null) t0 = now;
      const t = (now - t0) / 1000;
      curT = t;
      const dt = 1 / 60;

      for (const f of blossoms) {
        if (f.hp < 3 && f.regrowAt > 0 && t >= f.regrowAt) {
          if (f.hp === 0) {
            f.pop = t + 0.35;
            f.hp = 3;
            f.regrowAt = 0;
          } else {
            f.pop = t - 0.25;
            f.hp = 3;
            f.regrowAt = 0;
          }
        }
      }

      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, W, H);

      const aura = g.createRadialGradient(160, 140, 10, 160, 140, 135);
      aura.addColorStop(0, hsl(SAKURA_HUE, 75, 78, 0.26));
      aura.addColorStop(1, hsl(SAKURA_HUE, 75, 78, 0));
      g.fillStyle = aura;
      g.beginPath();
      g.arc(160, 140, 135, 0, 7);
      g.fill();

      // Back Paper Wrap Cone
      g.fillStyle = "#f2e2d4";
      g.beginPath();
      g.moveTo(78, 140);
      g.quadraticCurveTo(160, 65, 242, 140);
      g.lineTo(196, 282);
      g.lineTo(124, 282);
      g.closePath();
      g.fill();

      // Back layer blossoms
      for (const f of blossoms) {
        if (!f.back || f.hp <= 0) continue;
        const a = t - f.pop + 0.35;
        if (a < 0) continue;
        const sc = a < 0.35 ? 0.25 + a * 0.6 : backOut(clamp((a - 0.35) / 0.45));
        const spr = a < 0.35 ? 5 : 4 + (f.v & 1);
        const z = f.size * sc * (0.65 + (0.35 * f.hp) / 3) * 2;
        const c = Math.cos(f.rot);
        const s = Math.sin(f.rot);
        g.setTransform((c * DPR * z) / Z, (s * DPR * z) / Z, (-s * DPR * z) / Z, (c * DPR * z) / Z, f.x * DPR, f.y * DPR);
        g.globalAlpha = f.al;
        g.drawImage(blossomSpr[spr], -Z / 2, -Z / 2);
      }

      // Organic Branches
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.globalAlpha = 1;
      for (const b of branches) {
        const k = clamp((t - b.t0) / b.dur);
        if (k <= 0) continue;
        const gfrac = easeOut(k);
        const maxIdx = Math.max(1, Math.floor((b.pts.length - 1) * gfrac));
        g.strokeStyle = "#3c2934";
        g.lineWidth = lerp(b.w0, b.w1, 0.5);
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(b.pts[0][0], b.pts[0][1]);
        for (let i = 1; i <= maxIdx; i++) g.lineTo(b.pts[i][0], b.pts[i][1]);
        g.stroke();
      }

      // Front layer blossoms
      for (const f of blossoms) {
        if (f.back || f.hp <= 0) continue;
        const a = t - f.pop + 0.35;
        if (a < 0) continue;
        const sc = a < 0.35 ? 0.25 + a * 0.6 : backOut(clamp((a - 0.35) / 0.45));
        const spr = a < 0.35 ? 5 : f.v;
        const z = f.size * sc * (0.65 + (0.35 * f.hp) / 3) * 2;
        const c = Math.cos(f.rot + a * 0.25 * (1 - clamp(a)));
        const s = Math.sin(f.rot);
        g.setTransform((c * DPR * z) / Z, (s * DPR * z) / Z, (-s * DPR * z) / Z, (c * DPR * z) / Z, f.x * DPR, f.y * DPR);
        g.globalAlpha = f.al;
        g.drawImage(blossomSpr[spr], -Z / 2, -Z / 2);
      }

      // Front Bouquet Paper Fold & Satin Ribbon
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.globalAlpha = 1;
      g.strokeStyle = "#3c2934";
      g.lineWidth = 4.5;
      g.beginPath();
      g.moveTo(150, 278);
      g.lineTo(144, 320);
      g.moveTo(160, 278);
      g.lineTo(160, 324);
      g.moveTo(170, 278);
      g.lineTo(176, 320);
      g.stroke();

      g.fillStyle = "#f2e2d4";
      g.beginPath();
      g.moveTo(98, 202);
      g.quadraticCurveTo(160, 234, 222, 202);
      g.lineTo(192, 296);
      g.quadraticCurveTo(160, 308, 128, 296);
      g.closePath();
      g.fill();

      g.fillStyle = "#c4566e";
      g.beginPath();
      g.roundRect(128, 248, 64, 13, 6);
      g.fill();
      g.beginPath();
      g.ellipse(144, 252, 16, 9, -0.3, 0, 7);
      g.ellipse(176, 252, 16, 9, 0.3, 0, 7);
      g.fill();
      g.beginPath();
      g.arc(160, 254, 6.5, 0, 7);
      g.fill();

      for (let i = flying.length - 1; i >= 0; i--) {
        const p = flying[i];
        p.fl += p.fs * dt;
        p.x += (p.vx + Math.sin(p.fl) * 14) * dt;
        p.y += (p.vy + 45) * dt;
        p.rot += p.spin * dt;
        p.al -= 0.014;
        if (p.al <= 0 || p.y > H) {
          flying.splice(i, 1);
          continue;
        }
        const z = ((p.size * 2) / 28) * DPR;
        const c = Math.cos(p.rot);
        const s = Math.sin(p.rot);
        const sy = Math.cos(p.fl);
        g.globalAlpha = p.al;
        g.setTransform(c * z, s * z * sy, -s * z, c * z * sy, p.x * DPR, p.y * DPR);
        g.drawImage(petalSpr[p.spr], -14, -14);
      }
      g.globalAlpha = 1;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
    };
  }, [seed]);

  return (
    <article className="group relative flex h-full flex-col rounded-[28px] border border-line bg-paper p-4 shadow-[0_24px_50px_-34px_rgba(62,45,38,0.28)] transition-all duration-500 hover:-translate-y-1.5 hover:border-rose-deep/65 hover:shadow-[0_36px_70px_-32px_rgba(196,86,110,0.3)] select-none">
      {/* Inner bordered canvas stage */}
      <div className="relative flex h-[325px] w-full cursor-grab items-center justify-center overflow-hidden rounded-[22px] border border-line/80 bg-gradient-to-b from-rose-mist/65 via-cream/50 to-sage-mist/40">
        {product.badge ? (
          <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-rose/40 bg-white/90 px-3 py-1 text-[9px] font-semibold tracking-[0.12em] text-rose-deep uppercase shadow-2xs backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-deep" />
            {product.badge}
          </span>
        ) : (
          <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full border border-line bg-white/85 px-2.5 py-1 text-[8.5px] font-medium tracking-[0.14em] text-ink-soft uppercase">
            {product.category}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWish();
          }}
          aria-label="Yêu thích"
          className={cn(
            "absolute top-3 right-3 z-20 grid h-9 w-9 place-items-center rounded-full border transition-all duration-300 cursor-pointer",
            saved
              ? "border-rose-deep bg-rose-deep text-white shadow-sm"
              : "border-line bg-white/90 text-ink-soft hover:border-rose-deep hover:text-rose-deep"
          )}
        >
          <Icon name="heart" size={14} filled={saved} />
        </button>

        <canvas ref={canvasRef} className="h-[340px] w-[320px] transition-transform duration-500 group-hover:scale-105" />

        <span className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line/80 bg-white/90 px-3 py-1 text-[9.5px] font-medium text-ink-soft shadow-2xs backdrop-blur-md">
          Lướt chuột để rơi cánh · Hoa tự kết nụ nở lại 🌸
        </span>
      </div>

      {/* Card Body with Borders */}
      <div className="mt-4 flex flex-1 flex-col px-1">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={onInspect} className="text-left cursor-pointer">
            <h3 className="font-serif text-[26px] leading-tight text-ink transition-colors duration-300 group-hover:text-rose-deep">
              {product.name}
            </h3>
          </button>
          <span className="font-serif text-[21px] font-semibold text-rose-deep">{formatPrice(product.price)}</span>
        </div>

        <p className="mt-1 text-[12px] font-light text-ink-soft">{product.subtitle}</p>

        {/* Bordered flower tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.flowers.map((fl) => (
            <span
              key={fl}
              className="rounded-full border border-line bg-cream/70 px-2.5 py-0.5 text-[9.5px] text-ink-soft"
            >
              {fl}
            </span>
          ))}
        </div>

        {/* Bottom bordered footer inside card */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3.5 mt-4">
          <span className="flex items-center gap-1.5 text-[10px] text-ink-soft">
            <Icon name="leaf" size={12} className="text-sage-deep" />
            {product.stemCount} · {product.longevity}
          </span>
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-300 cursor-pointer",
              added
                ? "border-sage-deep bg-sage-deep text-white"
                : "border-ink bg-ink text-white hover:border-rose-deep hover:bg-rose-deep"
            )}
          >
            <span>{added ? "Đã thêm ✓" : "Chọn bó này"}</span>
            <Icon name={added ? "check" : "plus"} size={12} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function Collection({ onAdd, onToggleWish, wishlist, onConsult }: CollectionProps) {
  const [active, setActive] = useState("Tất cả");
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [justAdded, setJustAdded] = useState<number | null>(null);

  const filtered = active === "Tất cả" ? products : products.filter((product) => product.tags.includes(active));

  const handleAdd = (id: number) => {
    onAdd(id);
    setJustAdded(id);
    window.setTimeout(() => {
      setJustAdded((curr) => (curr === id ? null : curr));
    }, 1200);
  };

  return (
    <section id="bo-suu-tap" className="relative z-10 py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-5 text-center lg:mx-auto lg:max-w-[680px]">
          <Reveal>
            <p className="eyebrow justify-center">
              <span className="h-px w-7 bg-rose-deep/60" />
              Bộ sưu tập bó hoa đào hồng
              <span className="h-px w-7 bg-rose-deep/60" />
            </p>
          </Reveal>
          <Reveal delay={70}>
            <h2 className="display text-[clamp(2.3rem,5vw,3.6rem)] text-ink">
              Những bó hoa <span className="italic text-shimmer">rơi cánh &amp; tự hé nụ lại</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mx-auto max-w-[510px] text-[13px] leading-[1.85] font-light text-ink-soft">
              Lướt nhẹ qua từng bó hoa để thổi cánh hoa bay trong gió — chỉ những bông hoa vừa rụng sẽ tự động kết nụ
              và bung nở lại trên cành.
            </p>
          </Reveal>
        </div>

        <Reveal delay={90}>
          <div className="no-scrollbar mt-9 flex items-center justify-start gap-2 overflow-x-auto border-y border-line py-3.5 sm:justify-center">
            {occasions.map((occasion) => {
              const count =
                occasion === "Tất cả"
                  ? products.length
                  : products.filter((p) => p.tags.includes(occasion)).length;
              return (
                <button
                  key={occasion}
                  type="button"
                  className="chip"
                  data-active={active === occasion}
                  onClick={() => setActive(occasion)}
                >
                  <span>{occasion}</span>
                  <span className="ml-1 text-[9.5px] opacity-65">({count})</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {filtered.map((product, index) => (
            <Reveal key={`${active}-${product.id}`} delay={index * 70} from="scale" className="h-full">
              <ProceduralBouquetCard
                product={product}
                saved={wishlist.includes(product.id)}
                added={justAdded === product.id}
                onAdd={() => handleAdd(product.id)}
                onToggleWish={() => onToggleWish(product.id)}
                onInspect={() => setQuickView(product)}
              />
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-16 flex flex-col items-center justify-between gap-5 rounded-[28px] border border-line bg-rose-mist/55 px-6 py-6 sm:flex-row sm:px-8">
            <div className="flex items-center gap-3">
              <Stars count={5} size={12} className="text-gold" />
              <span className="text-[12.5px] text-ink">
                Bạn muốn điều chỉnh số cành hoặc phối giấy theo ý riêng?
              </span>
            </div>
            <button type="button" onClick={onConsult} className="btn btn-primary shrink-0">
              <span>Nhờ Mộc thiết kế riêng</span>
              <span className="btn-ic">
                <Icon name="arrowUpRight" size={14} />
              </span>
            </button>
          </div>
        </Reveal>
      </div>

      {quickView && (
        <div
          className="fixed inset-0 z-[96] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết bó hoa ${quickView.name}`}
        >
          <button
            type="button"
            aria-label="Đóng xem nhanh"
            onClick={() => setQuickView(null)}
            className="scrim absolute inset-0 h-full w-full cursor-default"
          />
          <div className="modal-in relative z-10 max-w-[520px] rounded-[32px] border border-line bg-cream p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setQuickView(null)}
              aria-label="Đóng"
              className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink-soft hover:text-ink cursor-pointer"
            >
              <Icon name="close" size={16} />
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose/40 bg-rose-soft px-3 py-1 text-[9px] font-semibold tracking-[0.14em] text-rose-deep uppercase">
              <BloomMark className="h-3.5 w-3.5" />
              {quickView.category}
            </span>
            <h3 className="display mt-3 text-[36px] text-ink">{quickView.name}</h3>
            <p className="mt-1 font-serif text-[24px] text-rose-deep">{formatPrice(quickView.price)}</p>
            <p className="mt-3 text-[13px] leading-[1.85] font-light text-ink-soft">{quickView.story}</p>
            <div className="mt-4 space-y-2 rounded-2xl border border-line bg-white/85 p-4 text-[11.5px]">
              <p>
                <b className="font-medium text-ink">Thành phần:</b> {quickView.flowers.join(" · ")}
              </p>
              <p>
                <b className="font-medium text-ink">Hương thơm:</b> {quickView.scent}
              </p>
              <p>
                <b className="font-medium text-ink">Độ tươi:</b> {quickView.stemCount} ({quickView.longevity})
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleAdd(quickView.id);
                setQuickView(null);
              }}
              className="btn btn-primary mt-6 w-full justify-between"
            >
              <span>Đặt bó hoa {quickView.name}</span>
              <span className="btn-ic">
                <Icon name="plus" size={14} />
              </span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
