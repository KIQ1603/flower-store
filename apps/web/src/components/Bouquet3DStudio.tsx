import { useState, type MouseEvent } from "react";
import { BloomMark, Icon } from "./Icons";
import { Reveal } from "./Reveal";
import { formatPrice } from "../data";
import { cn } from "../utils/cn";

type Bouquet3DStudioProps = {
  onAdd: (id: number) => void;
  onConsult: () => void;
  notify: (message: string, withCartAction?: boolean) => void;
};

const bloomOptions = [
  {
    id: 1,
    name: "Hồng Juliet",
    note: "Hồng tro xếp lớp · hương trà dịu",
    price: 890000,
    c1: "#fff4ef",
    c2: "#f0bfb3",
    c3: "#c9786a",
    center: "#e3b66b",
  },
  {
    id: 2,
    name: "Tulip Mây Trắng",
    note: "Trắng kem & hồng phấn · thanh khiết",
    price: 650000,
    c1: "#ffffff",
    c2: "#f4dcd6",
    c3: "#d8988e",
    center: "#e8c478",
  },
  {
    id: 4,
    name: "Mẫu Đơn Lụa Là",
    note: "Hồng nhung Coral · kiêu kỳ",
    price: 1150000,
    c1: "#fdebe7",
    c2: "#e8a89e",
    c3: "#b35c50",
    center: "#e6b86a",
  },
  {
    id: 3,
    name: "Cúc Vườn Mẹ",
    note: "Trắng kem mật ong · đồng nội",
    price: 720000,
    c1: "#fffdf8",
    c2: "#f3e2c7",
    c3: "#d9a84e",
    center: "#c78f32",
  },
];

const wrapOptions = [
  { id: "kraft", name: "Giấy Kraft Mộc", bg: "#ead9c3", inner: "#fffaf2", border: "#d4be9e" },
  { id: "cream", name: "Lụa Kem Sữa", bg: "#f6efe4", inner: "#ffffff", border: "#e4d8c5" },
  { id: "blush", name: "Hồng Phấn Mờ", bg: "#f3dcd4", inner: "#fff7f4", border: "#e2bfb4" },
  { id: "noir", name: "Đen Tuyền Atelier", bg: "#352e2c", inner: "#4e4441", border: "#5c504d" },
];

const ribbonOptions = [
  { id: "rose", name: "Lụa Hồng Tro", color: "#b56e64", light: "#d99b91" },
  { id: "sage", name: "Xanh Lá Bạc", color: "#687c61", light: "#95ab8b" },
  { id: "gold", name: "Vàng Champagne", color: "#b79b70", light: "#d8c098" },
];

export function Bouquet3DStudio({ onAdd, onConsult, notify }: Bouquet3DStudioProps) {
  const [selectedBloom, setSelectedBloom] = useState(bloomOptions[0]);
  const [selectedWrap, setSelectedWrap] = useState(wrapOptions[0]);
  const [selectedRibbon, setSelectedRibbon] = useState(ribbonOptions[0]);
  const [exploded, setExploded] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardText, setCardText] = useState("Mong một ngày dịu dàng đến với bạn, như nhành hoa vừa hé sớm nay.");
  const [tilt, setTilt] = useState({ rx: 8, ry: -14 });

  const handleStageMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Number((-py * 24).toFixed(2)),
      ry: Number((px * 28).toFixed(2)),
    });
  };

  const resetStage = () => {
    setTilt(exploded ? { rx: 12, ry: -22 } : { rx: 6, ry: -10 });
  };

  const toggleExploded = () => {
    setExploded((prev) => {
      const next = !prev;
      setTilt(next ? { rx: 14, ry: -24 } : { rx: 6, ry: -10 });
      return next;
    });
  };

  const handleAddCustom = () => {
    onAdd(selectedBloom.id);
    notify(
      `Đã thêm bó 3D “${selectedBloom.name}” (${selectedWrap.name} · ${selectedRibbon.name}) vào giỏ hoa!`,
      true
    );
  };

  return (
    <section
      id="xuong-hoa-3d"
      className="relative z-10 overflow-hidden border-y border-line/80 bg-gradient-to-b from-cream via-cream-2/70 to-cream py-20 lg:py-28"
    >
      {/* 3D ambient light orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-12 left-[8%] h-[420px] w-[420px] rounded-full bg-rose-soft/50 blur-[110px]" />
        <div className="absolute right-[6%] bottom-10 h-[440px] w-[440px] rounded-full bg-sage-soft/55 blur-[110px]" />
      </div>

      <div className="container-x relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[620px]">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-rose/40 bg-paper/80 px-3.5 py-1.5 shadow-sm backdrop-blur-sm">
                <span className="h-2 w-2 animate-ping rounded-full bg-rose-deep" />
                <span className="text-[9.5px] font-medium tracking-[0.22em] text-rose-deep uppercase">
                  Trải nghiệm 3D Studio · Tương tác trực tiếp
                </span>
              </div>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="display mt-4 text-[clamp(2.3rem,4.9vw,3.6rem)] text-ink">
                Tự tay phối bó hoa <span className="italic text-shimmer">trong không gian 3D</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={120} className="lg:max-w-[360px]">
            <p className="text-[12.5px] leading-[1.85] font-light text-ink-soft">
              Xoay 3D, bấm <b>“Tách lớp 3D”</b> để xem rõ cấu trúc 4 tầng của một bó hoa Mây &amp; Mộc, và thử lật tấm
              thiệp sáp viết tay ngay bên dưới.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
          {/* ---------------- LEFT: INTERACTIVE 3D STAGE ---------------- */}
          <Reveal from="left">
            <div
              onMouseMove={handleStageMove}
              onMouseLeave={resetStage}
              className="studio-3d-stage relative mx-auto flex min-h-[520px] w-full flex-col items-center justify-between overflow-hidden rounded-[36px] border border-line bg-paper/80 p-5 shadow-[0_50px_100px_-45px_rgba(62,50,40,0.45)] backdrop-blur-md sm:min-h-[570px] sm:p-7"
            >
              {/* Top stage controls */}
              <div className="relative z-20 flex w-full flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-cream/90 px-3 py-1.5 text-[10px] font-medium text-ink-soft shadow-xs">
                  <Icon name="sparkle" size={12} className="text-rose-deep" />
                  Di chuột để xoay 3D · Góc nghiêng ({Math.round(tilt.ry)}°, {Math.round(tilt.rx)}°)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleExploded}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[10.5px] font-medium transition-all duration-300 cursor-pointer",
                      exploded
                        ? "border-rose-deep bg-rose-deep text-cream shadow-[0_10px_24px_-8px_rgba(181,110,100,0.8)]"
                        : "border-line bg-cream text-ink hover:border-sage-deep"
                    )}
                  >
                    <Icon name="flower" size={13} />
                    {exploded ? "Đang tách 4 lớp 3D" : "Tách lớp 3D"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardFlipped((f) => !f)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[10.5px] font-medium transition-all duration-300 cursor-pointer",
                      cardFlipped
                        ? "border-sage-deep bg-sage-deep text-cream"
                        : "border-line bg-cream text-ink hover:border-sage-deep"
                    )}
                  >
                    <Icon name="mail" size={13} />
                    {cardFlipped ? "Mặt trong thiệp" : "Lật thiệp 3D"}
                  </button>
                </div>
              </div>

              {/* Center 3D Scene Container */}
              <div className="perspective-stage relative my-auto flex h-[370px] w-full items-center justify-center sm:h-[410px]">
                <div
                  className="preserve-3d relative h-[350px] w-[320px] transition-transform duration-200 ease-out sm:h-[380px] sm:w-[350px]"
                  style={{
                    transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                  }}
                >
                  {/* 3D Floor Pedestal Ring */}
                  <div
                    className="preserve-3d absolute inset-x-6 bottom-2 h-16 rounded-full border border-dashed border-sage/60 bg-sage-soft/35 transition-transform duration-700"
                    style={{
                      transform: "rotateX(76deg) translateZ(-70px)",
                      boxShadow: "0 0 60px rgba(93, 112, 86, 0.28)",
                    }}
                  />

                  {/* LAYER 1 (Back Z-plane): Eucalyptus & Foliage (-55px or -95px when exploded) */}
                  <div
                    className="preserve-3d pointer-events-none absolute inset-0 flex items-center justify-center transition-transform duration-700"
                    style={{
                      transform: `translateZ(${exploded ? -95 : -35}px) translateY(${exploded ? -18 : 0}px)`,
                    }}
                  >
                    <svg viewBox="0 0 360 380" className="h-full w-full overflow-visible drop-shadow-[0_18px_22px_rgba(47,56,47,0.18)]">
                      <path
                        d="M180 260 L95 75 M180 260 L265 75 M180 260 L180 48 M180 260 L65 145 M180 260 L295 145"
                        stroke="#53664b"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <ellipse cx="105" cy="95" rx="22" ry="38" transform="rotate(-30 105 95)" fill="#7d9474" />
                      <ellipse cx="75" cy="135" rx="20" ry="34" transform="rotate(-48 75 135)" fill="#96ac8c" />
                      <ellipse cx="255" cy="95" rx="22" ry="38" transform="rotate(30 255 95)" fill="#7d9474" />
                      <ellipse cx="285" cy="135" rx="20" ry="34" transform="rotate(48 285 135)" fill="#96ac8c" />
                      <ellipse cx="152" cy="68" rx="18" ry="32" transform="rotate(-14 152 68)" fill="#88a07e" />
                      <ellipse cx="208" cy="68" rx="18" ry="32" transform="rotate(14 208 68)" fill="#88a07e" />
                    </svg>
                    {exploded && (
                      <span className="absolute top-3 left-2 rounded-full border border-sage/60 bg-paper/95 px-2.5 py-0.5 text-[9px] font-medium text-sage-deep shadow-sm">
                        01 · Lá Bạc Nền (-95px Z)
                      </span>
                    )}
                  </div>

                  {/* LAYER 2 (Mid-Back Z-plane): Sculpted Back Paper Wrap */}
                  <div
                    className="preserve-3d pointer-events-none absolute inset-0 flex items-center justify-center transition-transform duration-700"
                    style={{
                      transform: `translateZ(${exploded ? -30 : -10}px)`,
                    }}
                  >
                    <svg viewBox="0 0 360 380" className="h-full w-full overflow-visible drop-shadow-[0_22px_28px_rgba(40,30,22,0.22)]">
                      <path
                        d="M58 152 L126 84 L180 116 L234 84 L302 152 L242 335 H118 Z"
                        fill={selectedWrap.bg}
                        stroke={selectedWrap.border}
                        strokeWidth="2"
                      />
                      <path
                        d="M84 166 L180 105 L276 166 L228 326 H132 Z"
                        fill={selectedWrap.inner}
                        opacity="0.82"
                      />
                    </svg>
                  </div>

                  {/* LAYER 3 (Center Z-plane): 3D Main Blooms Cluster */}
                  <div
                    className="preserve-3d pointer-events-none absolute inset-0 flex items-center justify-center transition-transform duration-700"
                    style={{
                      transform: `translateZ(${exploded ? 25 : 22}px) scale(${exploded ? 1.06 : 1})`,
                    }}
                  >
                    <svg viewBox="0 0 360 380" className="h-full w-full overflow-visible drop-shadow-[0_20px_24px_rgba(55,35,28,0.28)]">
                      {[
                        { x: 180, y: 150, r: 48 },
                        { x: 122, y: 176, r: 42 },
                        { x: 238, y: 174, r: 42 },
                        { x: 148, y: 108, r: 38 },
                        { x: 214, y: 110, r: 38 },
                        { x: 180, y: 204, r: 40 },
                      ].map((b, i) => (
                        <g key={i} transform={`translate(${b.x}, ${b.y})`}>
                          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                            <ellipse
                              key={a}
                              cx="0"
                              cy={-b.r * 0.45}
                              rx={b.r * 0.48}
                              ry={b.r * 0.56}
                              transform={`rotate(${a})`}
                              fill={selectedBloom.c1}
                              stroke="#3e4a3b"
                              strokeWidth="0.9"
                            />
                          ))}
                          {[20, 80, 140, 200, 260, 320].map((a) => (
                            <ellipse
                              key={a}
                              cx="0"
                              cy={-b.r * 0.3}
                              rx={b.r * 0.38}
                              ry={b.r * 0.44}
                              transform={`rotate(${a})`}
                              fill={selectedBloom.c2}
                            />
                          ))}
                          {[10, 70, 130, 190, 250, 310].map((a) => (
                            <ellipse
                              key={a}
                              cx="0"
                              cy={-b.r * 0.16}
                              rx={b.r * 0.25}
                              ry={b.r * 0.3}
                              transform={`rotate(${a})`}
                              fill={selectedBloom.c3}
                            />
                          ))}
                          <circle r={b.r * 0.13} fill={selectedBloom.center} />
                        </g>
                      ))}
                    </svg>
                    {exploded && (
                      <span className="absolute top-24 right-0 rounded-full border border-rose/60 bg-paper/95 px-2.5 py-0.5 text-[9px] font-medium text-rose-deep shadow-sm">
                        02 · Cụm Hoa Chính (+25px Z)
                      </span>
                    )}
                  </div>

                  {/* LAYER 4 (Front Z-plane): Sculpted Front Wrap + Silk Ribbon Bow */}
                  <div
                    className="preserve-3d pointer-events-none absolute inset-0 flex items-center justify-center transition-transform duration-700"
                    style={{
                      transform: `translateZ(${exploded ? 75 : 48}px) translateY(${exploded ? 14 : 0}px)`,
                    }}
                  >
                    <svg viewBox="0 0 360 380" className="h-full w-full overflow-visible drop-shadow-[0_24px_30px_rgba(38,28,22,0.3)]">
                      <path
                        d="M88 205 Q180 245 272 205 L234 345 Q180 360 126 345 Z"
                        fill={selectedWrap.bg}
                        stroke={selectedWrap.border}
                        strokeWidth="2"
                      />
                      <path
                        d="M108 216 Q180 252 252 216 L222 340 Q180 352 138 340 Z"
                        fill={selectedWrap.inner}
                        opacity="0.38"
                      />
                      {/* Ribbon Band & Bow */}
                      <path
                        d="M118 272 Q180 290 242 272 L238 292 Q180 308 122 292 Z"
                        fill={selectedRibbon.color}
                      />
                      <path
                        d="M180 286 C146 258 122 276 138 298 C148 310 168 300 180 286 Z"
                        fill={selectedRibbon.light}
                        stroke="#3e4a3b"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M180 286 C214 258 238 276 222 298 C212 310 192 300 180 286 Z"
                        fill={selectedRibbon.light}
                        stroke="#3e4a3b"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M176 289 Q158 332 142 362 L158 364 Q172 334 181 292 Z"
                        fill={selectedRibbon.color}
                      />
                      <path
                        d="M184 289 Q202 332 218 362 L202 364 Q188 334 179 292 Z"
                        fill={selectedRibbon.color}
                      />
                      <circle cx="180" cy="286" r="8.5" fill={selectedRibbon.color} stroke="#3e4a3b" strokeWidth="1.2" />
                    </svg>
                    {exploded && (
                      <span className="absolute bottom-14 left-0 rounded-full border border-gold/60 bg-paper/95 px-2.5 py-0.5 text-[9px] font-medium text-ink shadow-sm">
                        03 · Giấy &amp; Nơ Lụa (+75px Z)
                      </span>
                    )}
                  </div>

                  {/* LAYER 5 (Highest Z-plane +110px): Interactive 3D Flip Greeting Card */}
                  <div
                    onClick={() => setCardFlipped((f) => !f)}
                    title="Nhấn để lật mặt thiệp 3D"
                    className="preserve-3d absolute -right-2 bottom-4 z-30 h-[126px] w-[168px] cursor-pointer transition-transform duration-700 sm:-right-6"
                    style={{
                      transform: `translateZ(${exploded ? 120 : 82}px) rotateY(${cardFlipped ? 180 : -12}deg) rotateZ(4deg)`,
                    }}
                  >
                    {/* Front of 3D Card */}
                    <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-line bg-paper p-3.5 text-center shadow-[0_24px_45px_-18px_rgba(40,30,22,0.45)]">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-deep text-cream shadow-inner">
                        <BloomMark className="h-5 w-5" />
                      </span>
                      <p className="mt-2 font-serif text-[14px] text-ink">Thiệp Sáp Mây &amp; Mộc</p>
                      <p className="mt-0.5 text-[9px] tracking-[0.14em] text-rose-deep uppercase">
                        Nhấn để lật xem lời nhắn ↻
                      </p>
                    </div>

                    {/* Back of 3D Card (Handwritten Note) */}
                    <div
                      className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-2xl border border-rose/60 bg-[#fffdf8] p-3.5 shadow-[0_24px_45px_-18px_rgba(40,30,22,0.45)]"
                      style={{ transform: "rotateY(180deg)" }}
                    >
                      <div className="flex items-center justify-between border-b border-line/70 pb-1">
                        <span className="text-[8px] tracking-[0.18em] text-ink-faint uppercase">Thiệp viết tay</span>
                        <BloomMark className="h-3.5 w-3.5 text-rose-deep" />
                      </div>
                      <p className="hand line-clamp-3 text-[16px] leading-snug text-ink">
                        “{cardText || "Gửi người thương..."}”
                      </p>
                      <span className="text-right text-[8px] text-sage-deep italic">— Mây &amp; Mộc</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom summary bar inside stage */}
              <div className="relative z-20 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-cream/90 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-full border border-line shadow-inner"
                    style={{ background: selectedBloom.c2 }}
                  />
                  <div>
                    <p className="font-serif text-[18px] leading-none text-ink">{selectedBloom.name}</p>
                    <p className="mt-0.5 text-[10px] text-ink-soft">
                      {selectedWrap.name} · {selectedRibbon.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-serif text-[22px] font-medium text-rose-deep">
                    {formatPrice(selectedBloom.price)}
                  </span>
                  <button type="button" onClick={handleAddCustom} className="btn btn-primary !py-2.5 !pl-4 !pr-2.5">
                    <span>Đặt bó hoa này</span>
                    <span className="btn-ic !h-6 !w-6">
                      <Icon name="plus" size={13} />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ---------------- RIGHT: STEP-BY-STEP 3D CUSTOMIZER CONTROLS ---------------- */}
          <Reveal from="right" delay={100}>
            <div className="space-y-6 rounded-[32px] border border-line/80 bg-paper/90 p-6 shadow-[0_32px_70px_-48px_rgba(54,62,51,0.45)] sm:p-8">
              {/* Step 1 */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="field-label !mb-0">Bước 01 · Chọn Hoa Chủ Đạo</span>
                  <span className="text-[10px] text-rose-deep">{selectedBloom.note}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {bloomOptions.map((item) => {
                    const active = selectedBloom.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedBloom(item)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-300 cursor-pointer",
                          active
                            ? "border-rose-deep bg-rose-mist/70 shadow-sm -translate-y-0.5"
                            : "border-line bg-cream/60 hover:border-sage hover:bg-cream"
                        )}
                      >
                        <span
                          className="h-7 w-7 shrink-0 rounded-full border border-black/10 shadow-inner"
                          style={{
                            background: `radial-gradient(circle at 35% 35%, ${item.c1}, ${item.c2} 60%, ${item.c3})`,
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-serif text-[17px] leading-tight text-ink">
                            {item.name}
                          </span>
                          <span className="block text-[10px] font-medium text-rose-deep">
                            {formatPrice(item.price)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <span className="field-label">Bước 02 · Chọn Giấy Gói Mỹ Thuật</span>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {wrapOptions.map((wrap) => {
                    const active = selectedWrap.id === wrap.id;
                    return (
                      <button
                        key={wrap.id}
                        type="button"
                        onClick={() => setSelectedWrap(wrap)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all duration-300 cursor-pointer",
                          active
                            ? "border-sage-deep bg-sage-mist/80 shadow-sm -translate-y-0.5"
                            : "border-line bg-cream/50 hover:border-sage"
                        )}
                      >
                        <span
                          className="h-7 w-7 rounded-full border shadow-inner"
                          style={{ background: wrap.bg, borderColor: wrap.border }}
                        />
                        <span className="text-[10.5px] font-medium text-ink">{wrap.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <span className="field-label">Bước 03 · Chọn Dây Lụa Thắt Nơ</span>
                <div className="flex flex-wrap gap-2.5">
                  {ribbonOptions.map((rib) => {
                    const active = selectedRibbon.id === rib.id;
                    return (
                      <button
                        key={rib.id}
                        type="button"
                        onClick={() => setSelectedRibbon(rib)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-medium transition-all duration-300 cursor-pointer",
                          active
                            ? "border-ink bg-ink text-cream shadow-sm"
                            : "border-line bg-cream/70 text-ink-soft hover:border-sage"
                        )}
                      >
                        <span className="h-3.5 w-3.5 rounded-full" style={{ background: rib.color }} />
                        {rib.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Live 3D Card Message */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="field-label !mb-0">Bước 04 · Lời Nhắn Trên Thiệp 3D (Miễn Phí)</span>
                  <button
                    type="button"
                    onClick={() => setCardFlipped(true)}
                    className="text-[10px] font-medium text-rose-deep underline underline-offset-4 cursor-pointer"
                  >
                    Xem mặt chữ trên thiệp
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={90}
                  value={cardText}
                  onFocus={() => setCardFlipped(true)}
                  onChange={(e) => {
                    setCardText(e.target.value);
                    if (!cardFlipped) setCardFlipped(true);
                  }}
                  placeholder="Viết đôi lời nhắn gửi người thương…"
                  className="field mt-2"
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-ink-soft">
                  Muốn phối riêng theo ngân sách khác?{" "}
                  <button
                    type="button"
                    onClick={onConsult}
                    className="font-medium text-rose-deep underline underline-offset-4 cursor-pointer"
                  >
                    Nhắn Mộc tư vấn 1:1
                  </button>
                </p>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-sage-deep">
                  <Icon name="shield" size={13} />
                  Cam kết giống mẫu 98%
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
