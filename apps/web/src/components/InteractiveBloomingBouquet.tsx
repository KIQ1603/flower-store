import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { formatPrice, type Product } from "../data";
import { cn } from "../utils/cn";

type PaletteTheme = {
  id: string;
  name: string;
  outer: string;
  mid: string;
  inner: string;
  core: string;
  wrap: string;
  wrapInner: string;
  ribbon: string;
  glow: string;
};

export const BOUQUET_THEMES: PaletteTheme[] = [
  {
    id: "juliet",
    name: "Hồng Juliet",
    outer: "#fff0f3",
    mid: "#f6b8c6",
    inner: "#e06d88",
    core: "#f4c26b",
    wrap: "#f3e5d7",
    wrapInner: "#fffaf5",
    ribbon: "#c4566e",
    glow: "rgba(228, 115, 140, 0.42)",
  },
  {
    id: "coral",
    name: "Mẫu Đơn Cam Đào",
    outer: "#fff4ed",
    mid: "#f7bfa8",
    inner: "#de6b58",
    core: "#f5c563",
    wrap: "#efe0d0",
    wrapInner: "#fffbf7",
    ribbon: "#b85a4b",
    glow: "rgba(232, 120, 96, 0.42)",
  },
  {
    id: "pure",
    name: "Mây Trắng Tinh Khôi",
    outer: "#ffffff",
    mid: "#edf3ec",
    inner: "#b9cdb7",
    core: "#ebd886",
    wrap: "#e6d6c3",
    wrapInner: "#ffffff",
    ribbon: "#5e7a56",
    glow: "rgba(142, 178, 134, 0.42)",
  },
  {
    id: "lavender",
    name: "Tím Khói Mộng Mơ",
    outer: "#fbf5ff",
    mid: "#dec5eb",
    inner: "#9f72b8",
    core: "#f2ca78",
    wrap: "#efe6ef",
    wrapInner: "#fffaff",
    ribbon: "#7f5499",
    glow: "rgba(168, 120, 198, 0.42)",
  },
];

type BurstParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  alpha: number;
  color: string;
  isPetal: boolean;
};

type FlowerHeadSpec = {
  id: string;
  /** Position when closed (in 520x580 SVG coordinate space) */
  cx0: number;
  cy0: number;
  /** Position when fully bloomed */
  cx1: number;
  cy1: number;
  baseRadius: number;
  delay: number;
  kind: "rose" | "peony" | "bud";
};

const FLOWER_HEADS: FlowerHeadSpec[] = [
  // Outer back row
  { id: "f-tl", cx0: 225, cy0: 235, cx1: 145, cy1: 155, baseRadius: 46, delay: 0.08, kind: "bud" },
  { id: "f-tc", cx0: 260, cy0: 215, cx1: 260, cy1: 118, baseRadius: 52, delay: 0.05, kind: "peony" },
  { id: "f-tr", cx0: 295, cy0: 235, cx1: 375, cy1: 155, baseRadius: 46, delay: 0.1, kind: "bud" },
  // Mid row
  { id: "f-ml", cx0: 210, cy0: 268, cx1: 118, cy1: 245, baseRadius: 56, delay: 0.04, kind: "peony" },
  { id: "f-mr", cx0: 310, cy0: 268, cx1: 402, cy1: 245, baseRadius: 56, delay: 0.06, kind: "peony" },
  { id: "f-bl", cx0: 225, cy0: 298, cx1: 168, cy1: 318, baseRadius: 52, delay: 0.07, kind: "rose" },
  { id: "f-br", cx0: 295, cy0: 298, cx1: 352, cy1: 318, baseRadius: 52, delay: 0.09, kind: "rose" },
  // Center hero roses
  { id: "f-ul", cx0: 240, cy0: 248, cx1: 202, cy1: 195, baseRadius: 60, delay: 0.02, kind: "rose" },
  { id: "f-ur", cx0: 280, cy0: 248, cx1: 318, cy1: 195, baseRadius: 60, delay: 0.03, kind: "rose" },
  { id: "f-dc", cx0: 260, cy0: 295, cx1: 260, cy1: 302, baseRadius: 62, delay: 0.04, kind: "peony" },
  // Queen Center Rose (drawn last on top)
  { id: "f-queen", cx0: 260, cy0: 265, cx1: 260, cy1: 235, baseRadius: 76, delay: 0, kind: "rose" },
];

type Props = {
  product: Product;
  themeIndex: number;
  onThemeChange: (index: number) => void;
  onAdd: (id: number) => void;
  onBloomChange?: (bloomed: boolean) => void;
};

export function InteractiveBloomingBouquet({
  product,
  themeIndex,
  onThemeChange,
  onAdd,
  onBloomChange,
}: Props) {
  const [bloomed, setBloomed] = useState(false);
  const [bloomValue, setBloomValue] = useState(0); // 0 = tight bud, 1 = fully bloomed
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [added, setAdded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<BurstParticle[]>([]);
  const targetBloomRef = useRef(0);
  const currentBloomRef = useRef(0);

  const theme = BOUQUET_THEMES[themeIndex % BOUQUET_THEMES.length] ?? BOUQUET_THEMES[0];

  const spawnBurst = (opening: boolean) => {
    const count = opening ? 42 : 16;
    const colors = [theme.outer, theme.mid, theme.inner, theme.core, "#ffffff"];
    const next: BurstParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = opening ? 2.2 + Math.random() * 5.2 : 1 + Math.random() * 2.5;
      next.push({
        x: 260,
        y: 235,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (opening ? 1.5 : 0.4),
        size: 5 + Math.random() * 9,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.12,
        alpha: 1,
        color: colors[i % colors.length],
        isPetal: i % 3 !== 0,
      });
    }
    particlesRef.current = [...particlesRef.current, ...next];
  };

  const toggleBloom = () => {
    const next = !bloomed;
    setBloomed(next);
    targetBloomRef.current = next ? 1 : 0;
    spawnBurst(next);
    onBloomChange?.(next);
  };

  // Spring physics loop for smooth blooming + particle burst canvas
  useEffect(() => {
    let raf = 0;
    let velocity = 0;

    const tick = () => {
      const target = targetBloomRef.current;
      const current = currentBloomRef.current;
      const force = (target - current) * 0.085;
      velocity = velocity * 0.82 + force;
      const updated = current + velocity;

      if (Math.abs(target - updated) > 0.0005 || Math.abs(velocity) > 0.0005) {
        currentBloomRef.current = Math.max(0, Math.min(1.08, updated));
        setBloomValue(currentBloomRef.current);
      }

      // Render burst particles on overlay canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, 520, 580);
          const list = particlesRef.current;
          for (let i = list.length - 1; i >= 0; i--) {
            const p = list[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04; // gentle gravity
            p.vx *= 0.985;
            p.rot += p.vrot;
            p.alpha -= 0.014;
            if (p.alpha <= 0) {
              list.splice(i, 1);
              continue;
            }
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            if (p.isPetal) {
              const s = p.size;
              ctx.beginPath();
              ctx.moveTo(0, s);
              ctx.bezierCurveTo(-s * 0.85, s * 0.2, -s * 0.8, -s * 0.9, 0, -s);
              ctx.bezierCurveTo(s * 0.8, -s * 0.9, s * 0.85, s * 0.2, 0, s);
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [theme]);

  const b = Math.max(0, Math.min(1.08, bloomValue));

  return (
    <div className="relative mx-auto flex w-full max-w-[540px] flex-col items-center select-none">
      {/* Ambient dynamic glow behind the frameless bouquet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[95px] transition-all duration-700"
        style={{
          width: `${280 + b * 180}px`,
          height: `${280 + b * 180}px`,
          background: theme.glow,
          opacity: 0.55 + b * 0.35,
        }}
      />

      {/* Interactive Touch-to-Bloom Stage (NO FRAME / NO BOX) */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={bloomed}
        aria-label={bloomed ? "Chạm để khép nụ hoa lại" : "Chạm vào bó hoa để hoa nở bung rực rỡ"}
        onClick={toggleBloom}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleBloom();
          }
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const nx = (e.clientX - rect.left) / rect.width - 0.5;
          const ny = (e.clientY - rect.top) / rect.height - 0.5;
          setTilt({ x: -ny * 16, y: nx * 18 });
        }}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        className="perspective-stage group relative flex w-full cursor-pointer items-center justify-center"
      >
        {/* Particle Burst Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={520}
          height={580}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 h-full w-full"
        />

        {/* Floating Callout Pills that blossom out ONLY when bloomed (frameless floating notes) */}
        <div
          className={cn(
            "pointer-events-none absolute top-6 left-2 z-20 flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-[11px] font-medium text-ink shadow-[0_14px_30px_-10px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-700 sm:left-4",
            bloomed ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-75 opacity-0"
          )}
        >
          <span className="h-2 w-2 animate-ping rounded-full bg-rose-deep" />
          <span>{product.scent}</span>
        </div>

        <div
          className={cn(
            "pointer-events-none absolute top-14 right-2 z-20 flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-1.5 text-[11px] font-medium text-sage-deep shadow-[0_14px_30px_-10px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all delay-100 duration-700 sm:right-4",
            bloomed ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-75 opacity-0"
          )}
        >
          <Icon name="sparkle" size={13} className="text-gold" />
          <span>{product.stemCount} · {product.longevity}</span>
        </div>

        {/* Center Touch Prompt Badge when still in tight bud state */}
        <div
          className={cn(
            "pointer-events-none absolute top-8 left-1/2 z-30 -translate-x-1/2 transition-all duration-500",
            bloomed ? "-translate-y-4 scale-90 opacity-0" : "translate-y-0 scale-100 opacity-100"
          )}
        >
          <div className="flex items-center gap-2 rounded-full bg-ink/85 px-4 py-2 text-[11.5px] font-medium text-white shadow-lg backdrop-blur-md">
            <span className="h-2 w-2 animate-ping rounded-full bg-rose" />
            <span>Chạm vào bó hoa để hoa nở bung 🌸</span>
          </div>
        </div>

        {/* 3D Sculpted Bouquet SVG (Frameless) */}
        <div
          className="preserve-3d relative w-full transition-transform duration-200 ease-out"
          style={{
            transform: `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)`,
          }}
        >
          <svg
            viewBox="0 0 520 580"
            className="h-auto w-full overflow-visible drop-shadow-[0_35px_50px_rgba(62,42,36,0.22)]"
          >
            <defs>
              <radialGradient id="petalGradOuter" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor={theme.outer} />
                <stop offset="100%" stopColor={theme.mid} />
              </radialGradient>
              <radialGradient id="petalGradMid" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor={theme.outer} />
                <stop offset="55%" stopColor={theme.mid} />
                <stop offset="100%" stopColor={theme.inner} />
              </radialGradient>
              <radialGradient id="petalGradInner" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor={theme.mid} />
                <stop offset="55%" stopColor={theme.inner} />
                <stop offset="100%" stopColor="#7a283b" />
              </radialGradient>
              <linearGradient id="wrapConeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme.wrapInner} />
                <stop offset="55%" stopColor={theme.wrap} />
                <stop offset="100%" stopColor="#d5c0a8" />
              </linearGradient>
              <filter id="headDropShadow" x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#2c1d18" floodOpacity="0.2" />
              </filter>
            </defs>

            {/* Pulsing ripple rings when blooming */}
            <circle
              cx="260"
              cy="240"
              r={110 + b * 115}
              fill="none"
              stroke={theme.mid}
              strokeWidth="1.5"
              strokeDasharray="4 8"
              opacity={0.18 + b * 0.35}
            />
            <circle
              cx="260"
              cy="240"
              r={85 + b * 145}
              fill="none"
              stroke={theme.core}
              strokeWidth="1"
              opacity={b * 0.4}
            />

            {/* 1. Back Sculpted Paper Fan (expands gracefully as the flowers bloom) */}
            <g filter="url(#headDropShadow)">
              <path
                d={`M ${155 - b * 48} ${235 - b * 28}
                    Q ${205 - b * 25} ${120 - b * 36} 260 ${155 - b * 30}
                    Q ${315 + b * 25} ${120 - b * 36} ${365 + b * 48} ${235 - b * 28}
                    L 325 465 H 195 Z`}
                fill="url(#wrapConeGrad)"
              />
              <path
                d={`M ${175 - b * 36} ${250 - b * 20}
                    Q 260 ${145 - b * 28} ${345 + b * 36} ${250 - b * 20}
                    L 312 455 H 208 Z`}
                fill={theme.wrapInner}
                opacity="0.78"
              />
            </g>

            {/* 2. Eucalyptus & Baby's Breath Sprigs (unfurl outward from center when blooming!) */}
            {[
              { angle: -52, len: 185 },
              { angle: -28, len: 205 },
              { angle: 0, len: 215 },
              { angle: 28, len: 205 },
              { angle: 52, len: 185 },
              { angle: -72, len: 165 },
              { angle: 72, len: 165 },
            ].map((sprig, idx) => {
              const currentAngle = sprig.angle * (0.28 + b * 0.72);
              const currentLen = sprig.len * (0.58 + b * 0.48);
              const rad = ((currentAngle - 90) * Math.PI) / 180;
              const tx = 260 + Math.cos(rad) * currentLen;
              const ty = 320 + Math.sin(rad) * currentLen;
              const mx = 260 + Math.cos(rad) * (currentLen * 0.68);
              const my = 320 + Math.sin(rad) * (currentLen * 0.68);

              return (
                <g key={idx}>
                  <path
                    d={`M 260 340 Q ${mx} ${my} ${tx} ${ty}`}
                    stroke="#52694b"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Eucalyptus leaves along stem */}
                  <ellipse
                    cx={mx}
                    cy={my}
                    rx={10 + b * 7}
                    ry={18 + b * 9}
                    transform={`rotate(${currentAngle - 28} ${mx} ${my})`}
                    fill="#78946e"
                  />
                  <ellipse
                    cx={tx}
                    cy={ty}
                    rx={9 + b * 6}
                    ry={16 + b * 8}
                    transform={`rotate(${currentAngle + 22} ${tx} ${ty})`}
                    fill="#92ad88"
                  />
                  {/* Baby's breath white buds popping out when bloomed */}
                  <circle
                    cx={tx + Math.cos(rad) * 16 * b}
                    cy={ty + Math.sin(rad) * 16 * b}
                    r={2.5 + b * 4.5}
                    fill="#ffffff"
                    opacity={0.3 + b * 0.7}
                  />
                  <circle
                    cx={tx + Math.cos(rad + 0.25) * 22 * b}
                    cy={ty + Math.sin(rad + 0.25) * 22 * b}
                    r={2 + b * 3.5}
                    fill={theme.core}
                    opacity={b * 0.85}
                  />
                </g>
              );
            })}

            {/* 3. Stems connecting each Flower Head down to the Tie Point (260, 395) */}
            {FLOWER_HEADS.map((fh) => {
              const localB = Math.max(0, Math.min(1.08, (b - fh.delay) / (1 - fh.delay)));
              const cx = fh.cx0 + (fh.cx1 - fh.cx0) * localB;
              const cy = fh.cy0 + (fh.cy1 - fh.cy0) * localB;
              return (
                <path
                  key={`stem-${fh.id}`}
                  d={`M 260 400 Q ${(260 + cx) / 2} ${(400 + cy) / 2 + 25} ${cx} ${cy}`}
                  stroke="#496042"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                />
              );
            })}

            {/* 4. The 11 Blooming Flower Heads!
                When localB = 0 (closed bud), petals are tightly furled inward and small.
                When localB -> 1 (bloomed), 3 rings of petals unfurl wide open in 360 degrees! */}
            {FLOWER_HEADS.map((fh) => {
              const localB = Math.max(0, Math.min(1.08, (b - fh.delay) / (1 - fh.delay)));
              const cx = fh.cx0 + (fh.cx1 - fh.cx0) * localB;
              const cy = fh.cy0 + (fh.cy1 - fh.cy0) * localB;
              const r = fh.baseRadius * (0.42 + localB * 0.62);

              // Outer petals spread from tight cup (offset 0.18*r) to wide open blossom (offset 0.52*r)
              const outerSpread = r * (0.16 + localB * 0.38);
              const midSpread = r * (0.12 + localB * 0.28);
              const innerSpread = r * (0.08 + localB * 0.16);
              const rotSpin = localB * 28;

              return (
                <g
                  key={fh.id}
                  transform={`translate(${cx}, ${cy}) rotate(${rotSpin})`}
                  filter="url(#headDropShadow)"
                >
                  {/* Sepals visible when in bud state */}
                  {[0, 72, 144, 216, 288].map((a) => (
                    <path
                      key={`sepal-${a}`}
                      d={`M 0 0 Q -6 ${-r * 0.55} 0 ${-r * (0.72 + localB * 0.25)} Q 6 ${-r * 0.55} 0 0`}
                      transform={`rotate(${a + 36})`}
                      fill="#68845e"
                      opacity={0.75 - localB * 0.35}
                    />
                  ))}

                  {/* Outer Layer of 8 Petals */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                    <ellipse
                      key={`o-${a}`}
                      cx="0"
                      cy={-outerSpread}
                      rx={r * (0.28 + localB * 0.22)}
                      ry={r * (0.42 + localB * 0.16)}
                      transform={`rotate(${a})`}
                      fill="url(#petalGradOuter)"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                  ))}

                  {/* Middle Layer of 6 Petals */}
                  {[22, 82, 142, 202, 262, 322].map((a) => (
                    <ellipse
                      key={`m-${a}`}
                      cx="0"
                      cy={-midSpread}
                      rx={r * (0.24 + localB * 0.15)}
                      ry={r * (0.34 + localB * 0.12)}
                      transform={`rotate(${a - rotSpin * 0.5})`}
                      fill="url(#petalGradMid)"
                    />
                  ))}

                  {/* Inner Core Layer of 5 Petals */}
                  {[10, 82, 154, 226, 298].map((a) => (
                    <ellipse
                      key={`i-${a}`}
                      cx="0"
                      cy={-innerSpread}
                      rx={r * (0.18 + localB * 0.08)}
                      ry={r * (0.24 + localB * 0.08)}
                      transform={`rotate(${a + rotSpin * 0.7})`}
                      fill="url(#petalGradInner)"
                    />
                  ))}

                  {/* Golden Stamen Center (reveals as flower opens!) */}
                  <circle
                    r={r * (0.04 + localB * 0.12)}
                    fill={theme.core}
                    opacity={0.25 + localB * 0.75}
                  />
                  {localB > 0.35 &&
                    [0, 60, 120, 180, 240, 300].map((a) => (
                      <circle
                        key={`st-${a}`}
                        cx={Math.cos((a * Math.PI) / 180) * r * 0.16 * localB}
                        cy={Math.sin((a * Math.PI) / 180) * r * 0.16 * localB}
                        r={1.8 * localB}
                        fill="#fff8dc"
                      />
                    ))}
                </g>
              );
            })}

            {/* 5. Front Sculpted Silk/Kraft Wrapping Cone & Flowing Satin Ribbon */}
            <g filter="url(#headDropShadow)">
              {/* Lower stems emerging at the bottom */}
              <path
                d="M 244 480 L 236 545 M 260 480 L 260 552 M 276 480 L 284 545"
                stroke="#496042"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              {/* Front Paper Wrap Fold */}
              <path
                d={`M ${172 - b * 24} 325
                    Q 260 375 ${348 + b * 24} 325
                    L 304 505
                    Q 260 522 216 505 Z`}
                fill="url(#wrapConeGrad)"
              />
              <path
                d={`M ${192 - b * 18} 338
                    Q 260 382 ${328 + b * 18} 338
                    L 294 498
                    Q 260 512 226 498 Z`}
                fill="#ffffff"
                opacity="0.35"
              />

              {/* Satin Ribbon Waistband */}
              <path
                d="M 206 416 Q 260 436 314 416 L 309 438 Q 260 456 211 438 Z"
                fill={theme.ribbon}
              />
              {/* Left & Right Bow Loops (expand slightly when blooming) */}
              <path
                d={`M 260 428 C ${212 - b * 14} 392 ${186 - b * 12} 422 208 446 C 222 460 245 446 260 428 Z`}
                fill={theme.ribbon}
              />
              <path
                d={`M 260 428 C ${308 + b * 14} 392 ${334 + b * 12} 422 312 446 C 298 460 275 446 260 428 Z`}
                fill={theme.ribbon}
              />
              {/* Flowing Ribbon Tails */}
              <path
                d={`M 255 432 Q ${230 - b * 12} 488 ${204 - b * 18} 542 L ${224 - b * 14} 546 Q 245 492 262 436 Z`}
                fill={theme.ribbon}
              />
              <path
                d={`M 265 432 Q ${290 + b * 12} 488 ${316 + b * 18} 542 L ${296 + b * 14} 546 Q 275 492 258 436 Z`}
                fill={theme.ribbon}
              />
              <circle cx="260" cy="428" r="11" fill={theme.ribbon} stroke="#ffffff" strokeWidth="1" />
            </g>
          </svg>
        </div>
      </div>

      {/* Frameless Floating Controls Bar underneath the bouquet */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
        {/* Bloom / Unfurl Toggle Pill */}
        <button
          type="button"
          onClick={toggleBloom}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-semibold shadow-md transition-all duration-300 cursor-pointer",
            bloomed
              ? "bg-sage-deep text-white hover:brightness-105"
              : "bg-gradient-to-r from-rose-deep to-[#df788d] text-white hover:scale-105"
          )}
        >
          <Icon name="flower" size={15} />
          <span>{bloomed ? "Hoa đang nở rộ · Chạm để khép nụ" : "Chạm để bó hoa nở bung 🌸"}</span>
        </button>

        {/* Color Theme Swatches */}
        <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-md">
          {BOUQUET_THEMES.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onThemeChange(idx);
                if (!bloomed) {
                  setBloomed(true);
                  targetBloomRef.current = 1;
                  onBloomChange?.(true);
                }
                spawnBurst(true);
              }}
              title={t.name}
              aria-label={`Đổi sắc hoa ${t.name}`}
              className={cn(
                "h-6 w-6 rounded-full border transition-transform duration-300 cursor-pointer",
                themeIndex === idx ? "scale-125 border-ink ring-2 ring-rose/40" : "border-black/10 hover:scale-110"
              )}
              style={{
                background: `radial-gradient(circle at 35% 35%, ${t.outer}, ${t.mid} 55%, ${t.inner})`,
              }}
            />
          ))}
        </div>

        {/* Quick Order Button */}
        <button
          type="button"
          onClick={() => {
            onAdd(product.id);
            setAdded(true);
            spawnBurst(true);
            window.setTimeout(() => setAdded(false), 1200);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-[12px] font-semibold text-ink shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-ink hover:text-white cursor-pointer"
        >
          <span>{added ? "Đã thêm vào giỏ ✓" : `Đặt bó này · ${formatPrice(product.price)}`}</span>
          <Icon name={added ? "check" : "plus"} size={14} />
        </button>
      </div>
    </div>
  );
}
