/* Hand-drawn chibi illustrations — cohesive botanical editorial palette,
   anatomically connected limbs & joints, and lively SVG micro-animations. */

const C = {
  line: "#3e4a3b",
  skin: "#fce8d8",
  skinShade: "#f0d2bc",
  cheek: "#e89b93",
  hair: "#463a33",
  hairLight: "#69584f",
  sage: "#95ab8b",
  sageDeep: "#5a7052",
  sageLight: "#dce6d3",
  sageMist: "#eef3e9",
  cream: "#fffaf2",
  kraft: "#ead9c3",
  kraftDeep: "#d4be9e",
  rose: "#dc9e95",
  roseDeep: "#b56e64",
  blush: "#f5dcd6",
  gold: "#cca86e",
  water: "#8ab8c9",
};

const bodyStroke = {
  stroke: C.line,
  strokeWidth: 1.85,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const thinStroke = {
  stroke: C.line,
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Rose({
  x,
  y,
  s = 1,
  fill = C.cream,
  inner = C.blush,
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
  inner?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={C.line} strokeWidth={1.25}>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="0" cy="-12" rx="10" ry="12.5" transform={`rotate(${a})`} fill={fill} />
      ))}
      {[20, 92, 164, 236, 308].map((a) => (
        <ellipse key={a} cx="0" cy="-6.5" rx="6.2" ry="7.8" transform={`rotate(${a})`} fill={inner} />
      ))}
      <circle r="3.4" fill={C.gold} />
    </g>
  );
}

function Daisy({
  x,
  y,
  s = 1,
  fill = C.cream,
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={C.line} strokeWidth={1.15}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse key={a} cx="0" cy="-8.5" rx="3.6" ry="6.8" transform={`rotate(${a})`} fill={fill} />
      ))}
      <circle r="3.2" fill={C.gold} />
    </g>
  );
}

function Sparkle({ x, y, s = 1, className }: { x: number; y: number; s?: number; className?: string }) {
  return (
    <path
      d={`M${x} ${y - 8 * s} C${x + 1.2 * s} ${y - 2 * s} ${x + 2.5 * s} ${y - 1 * s} ${x + 8 * s} ${y} C${x + 2.5 * s} ${y + 1 * s} ${x + 1.2 * s} ${y + 2 * s} ${x} ${y + 8 * s} C${x - 1.2 * s} ${y + 2 * s} ${x - 2.5 * s} ${y + 1 * s} ${x - 8 * s} ${y} C${x - 2.5 * s} ${y - 1 * s} ${x - 1.2 * s} ${y - 2 * s} ${x} ${y - 8 * s}Z`}
      fill={C.gold}
      className={className}
    />
  );
}

function Heart({ x, y, s = 1, fill = C.rose, className }: { x: number; y: number; s?: number; fill?: string; className?: string }) {
  return (
    <path
      d={`M${x} ${y + 4 * s} C${x - 5 * s} ${y} ${x - 10 * s} ${y - 4 * s} ${x - 10 * s} ${y - 9 * s} C${x - 10 * s} ${y - 14 * s} ${x - 3 * s} ${y - 15 * s} ${x} ${y - 9 * s} C${x + 3 * s} ${y - 15 * s} ${x + 10 * s} ${y - 14 * s} ${x + 10 * s} ${y - 9 * s} C${x + 10 * s} ${y - 4 * s} ${x + 5 * s} ${y} ${x} ${y + 4 * s}Z`}
      fill={fill}
      stroke={C.line}
      strokeWidth={1.2}
      strokeLinejoin="round"
      className={className}
    />
  );
}

/* ============================================================================
   Hero & Consult: Chibi florist watering blooming roses
   All body parts (head -> neck -> shoulders -> sleeves -> arms -> hands ->
   dress/apron -> legs -> socks -> boots) are fully connected and outlined.
   ============================================================================ */

export function ChibiWatering({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 270 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cô chibi làm vườn đang tưới những nhành hồng"
      role="img"
    >
      {/* Ground shadow */}
      <ellipse cx="128" cy="232" rx="92" ry="9" fill={C.sageLight} opacity="0.85" />
      <ellipse cx="96" cy="232" rx="46" ry="6" fill={C.sage} opacity="0.35" />

      {/* Blooming rose bush on the right being watered */}
      <g className="chibi-plant-sway" style={{ transformOrigin: "218px 228px" }}>
        {/* Terracotta pot */}
        <path d="M198 194h40l-5 34c-2 3-6 4-15 4s-13-1-15-4l-5-34Z" fill={C.rose} {...bodyStroke} />
        <rect x="194" y="186" width="48" height="9" rx="4" fill={C.blush} {...bodyStroke} />
        {/* Stems & leaves */}
        <path d="M218 186c-2-24 2-48 8-70M212 186c-8-18-12-36-10-54M224 186c8-16 14-32 16-48" stroke={C.sageDeep} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M214 156c-12-4-18-11-18-20 10-1 16 6 18 20ZM224 148c12-5 18-12 18-21-10 0-16 7-18 21Z" fill={C.sage} {...thinStroke} />
        <Rose x={226} y={110} s={0.78} fill={C.cream} inner={C.rose} />
        <Rose x={200} y={128} s={0.58} fill={C.blush} inner={C.roseDeep} />
        <Daisy x={242} y={134} s={0.58} fill={C.cream} />
      </g>

      {/* Main Character Group */}
      <g className="chibi-breathe" style={{ transformOrigin: "96px 228px" }}>
        {/* Back hair ponytail / ribbon */}
        <path d="M68 112c-16 4-28 16-30 32 12-2 22-8 28-18" fill={C.rose} {...bodyStroke} />
        <path d="M56 124c-10 6-16 15-16 25 9-3 16-9 20-18" fill={C.blush} {...thinStroke} />

        {/* Connected Legs (from under dress y=176 down to boots y=228) */}
        {/* Left leg */}
        <path d="M80 176h12v36H80v-36Z" fill={C.skin} {...bodyStroke} />
        <path d="M79 202h14v12H79v-12Z" fill={C.cream} {...thinStroke} />
        <path d="M75 212c0-3 3-5 7-5h11c4 0 6 2 6 6v11c0 2-2 3-4 3H74c-2 0-3-1-3-3v-5c0-4 2-7 4-7Z" fill={C.sageDeep} {...bodyStroke} />
        {/* Right leg */}
        <path d="M100 176h12v36h-12v-36Z" fill={C.skin} {...bodyStroke} />
        <path d="M99 202h14v12H99v-12Z" fill={C.cream} {...thinStroke} />
        <path d="M98 212c0-3 3-5 7-5h11c4 0 6 2 6 6v11c0 2-2 3-4 3H97c-2 0-3-1-3-3v-5c0-4 2-7 4-7Z" fill={C.sageDeep} {...bodyStroke} />

        {/* Left Shoulder, Puff Sleeve & Left Arm (connected to torso and supporting back of watering can) */}
        <path d="M76 130c-10 2-18 11-18 22 0 9 7 15 16 14l10-2" fill={C.skin} {...bodyStroke} />
        <path d="M80 128c-9 0-16 6-17 15 6 4 13 4 19 0l-2-15Z" fill={C.cream} {...bodyStroke} />

        {/* Neck (firmly connecting head y=118 to collar y=132) */}
        <path d="M88 116h16v18H88v-18Z" fill={C.skin} {...bodyStroke} />
        <path d="M89 124c4 3 10 3 14 0" stroke={C.skinShade} strokeWidth="2" strokeLinecap="round" />

        {/* Dress & Sage Florist Apron */}
        <path d="M74 130c2-5 10-8 22-8s20 3 22 8l10 52c-18 8-46 8-64 0l10-52Z" fill={C.cream} {...bodyStroke} />
        <path d="M80 132c4-3 28-3 32 0l6 48c-14 6-30 6-44 0l6-48Z" fill={C.sage} {...bodyStroke} />
        {/* Apron straps & collar */}
        <path d="M84 132v-8M108 132v-8" stroke={C.line} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M85 128c5 5 17 5 22 0" fill={C.cream} {...thinStroke} />
        {/* Apron pocket with mini heart */}
        <rect x="87" y="152" width="18" height="14" rx="3" fill={C.sageLight} {...thinStroke} />
        <Heart x={96} y={161} s={0.42} fill={C.roseDeep} />

        {/* Head & Ears */}
        <g className="chibi-head-nod" style={{ transformOrigin: "96px 120px" }}>
          <ellipse cx="58" cy="92" rx="6" ry="7" fill={C.skin} {...bodyStroke} />
          <ellipse cx="134" cy="92" rx="6" ry="7" fill={C.skin} {...bodyStroke} />
          <ellipse cx="96" cy="88" rx="37" ry="34" fill={C.skin} {...bodyStroke} />

          {/* Hair */}
          <path
            d="M59 90C54 54 72 40 96 40c25 0 42 15 37 51-2 10-7 11-9 3-3-13-9-20-21-22-14-2-25 3-31 15-4 9-10 11-13 3Z"
            fill={C.hair}
            {...bodyStroke}
          />
          {/* Side locks framing face */}
          <path
            d="M61 86c-4 17-1 29 7 35-3-12-3-23 0-34ZM131 86c4 17 1 29-7 35 3-12 3-23 0-34Z"
            fill={C.hair}
            {...bodyStroke}
          />
          <path d="M74 66c10-8 24-11 37-8" stroke={C.hairLight} strokeWidth="1.6" strokeLinecap="round" />

          {/* Hair flower clip */}
          <Daisy x={123} y={62} s={0.78} fill={C.cream} />

          {/* Face expressions */}
          <g className="chibi-eyes">
            <ellipse cx="81" cy="91" rx="2.6" ry="3.6" fill={C.line} />
            <ellipse cx="111" cy="91" rx="2.6" ry="3.6" fill={C.line} />
            <circle cx="82" cy="89.5" r="1" fill={C.cream} />
            <circle cx="112" cy="89.5" r="1" fill={C.cream} />
          </g>
          <path d="M76 81c2.5-2 6.5-2 9 0M107 81c2.5-2 6.5-2 9 0" {...thinStroke} />
          <ellipse cx="71" cy="100" rx="6.5" ry="3.6" fill={C.cheek} opacity="0.7" />
          <ellipse cx="121" cy="100" rx="6.5" ry="3.6" fill={C.cheek} opacity="0.7" />
          <path d="M91 101c2.5 3.2 7.5 3.2 10 0" {...bodyStroke} />
        </g>

        {/* Right Shoulder, Sleeve, Arm & Watering Can (connected and pivoting smoothly at shoulder 114, 134) */}
        <g className="chibi-pour" style={{ transformOrigin: "114px 134px" }}>
          {/* Watering Can held directly in her hands */}
          {/* Top arch handle */}
          <path d="M138 140c-2-12 8-20 18-18 9 1 14 9 12 19" fill="none" stroke={C.line} strokeWidth="2.2" />
          {/* Side handle */}
          <path d="M136 146c-8 0-12 5-12 11s4 11 12 11" fill="none" stroke={C.line} strokeWidth="2.2" />
          {/* Can body */}
          <rect x="135" y="138" width="34" height="34" rx="8" fill={C.sage} {...bodyStroke} />
          <path d="M139 146h26" stroke={C.cream} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          {/* Spout reaching toward the rose pot */}
          <path d="M168 156l24-18 4 5-24 22-4-9Z" fill={C.sageLight} {...bodyStroke} />
          {/* Spout rose nozzle */}
          <ellipse cx="196" cy="138" rx="4" ry="7" transform="rotate(35 196 138)" fill={C.rose} {...bodyStroke} />

          {/* Connected Right Arm from shoulder (112, 130) to hand gripping the handle (144, 138) */}
          <path
            d="M110 130c10 1 22 4 34 8 4 1 6 5 4 8-2 4-6 5-10 4-11-2-21-5-30-9l2-11Z"
            fill={C.skin}
            {...bodyStroke}
          />
          {/* Right Puff Sleeve overlapping shoulder */}
          <path d="M108 128c8-1 15 4 17 12-5 5-12 6-19 2l2-14Z" fill={C.cream} {...bodyStroke} />
          {/* Connected Hand gripping handle */}
          <circle cx="144" cy="140" r="6.5" fill={C.skin} {...bodyStroke} />

          {/* Animated Water Droplets arcing from nozzle (198, 138) to roses (218, 120..160) */}
          <g fill={C.water} stroke={C.line} strokeWidth="1.1">
            <path d="M204 132c3-2 6 1 4 4-1 2-4 2-5 0s-1-3 1-4Z" className="water-drop water-drop-1" />
            <path d="M214 142c3-2 6 1 4 4-1 2-4 2-5 0s-1-3 1-4Z" className="water-drop water-drop-2" />
            <path d="M209 152c3-2 6 1 4 4-1 2-4 2-5 0s-1-3 1-4Z" className="water-drop water-drop-3" />
          </g>
          <path
            d="M202 134c10-6 20-2 26 8M201 140c8-2 15 4 19 14"
            stroke={C.sageDeep}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 6"
            className="water-stream"
          />
        </g>
      </g>

      <Sparkle x={238} y={84} s={0.85} className="chibi-sparkle" />
      <Sparkle x={42} y={66} s={0.85} className="chibi-sparkle chibi-sparkle-2" />
      <Sparkle x={156} y={48} s={0.7} className="chibi-sparkle chibi-sparkle-3" />
    </svg>
  );
}

/* ============================================================================
   Process 01: Picking fresh flowers in the morning garden
   Connected legs + boots, left arm holding basket, right arm snipping rose stem
   ============================================================================ */

export function ChibiPicking({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 215" fill="none" className={className} role="img" aria-label="Chibi hái hoa trong vườn">
      {/* Ground & garden grass */}
      <ellipse cx="120" cy="196" rx="92" ry="8" fill={C.sageLight} opacity="0.85" />
      <path d="M24 192c54-8 138-8 192 0" stroke={C.sageDeep} strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />

      {/* Left garden daisies */}
      <g className="chibi-plant-sway" style={{ transformOrigin: "40px 190px" }}>
        <path d="M40 190c0-28-2-52-1-78" stroke={C.sageDeep} strokeWidth="2" strokeLinecap="round" />
        <path d="M40 144c-10-2-15-8-16-16 9-1 14 5 16 16ZM40 160c10-2 15-8 16-16-9-1-14 5-16 16Z" fill={C.sage} {...thinStroke} />
        <Daisy x={39} y={106} s={1.15} fill={C.blush} />
      </g>

      {/* Right tall garden roses being snipped */}
      <g className="chibi-plant-sway" style={{ transformOrigin: "184px 190px" }}>
        <path d="M184 190c2-32 4-58 2-84" stroke={C.sageDeep} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M185 148c11-2 16-8 18-17-9-1-15 5-18 17ZM184 162c-10-2-15-8-16-16 8-1 13 5 16 16Z" fill={C.sage} {...thinStroke} />
        <Rose x={186} y={100} s={0.68} fill={C.cream} inner={C.rose} />
        <Daisy x={204} y={124} s={0.55} fill={C.cream} />
      </g>

      {/* Animated Butterfly */}
      <g stroke={C.line} strokeWidth="1.2" fill={C.blush} className="animate-floaty">
        <path d="M158 46c-7-9-16-8-19-1-2 6 6 11 16 8" />
        <path d="M160 48c7-9 16-7 18 0 2 6-6 10-16 7" />
        <path d="M160 44c-2 6-1 11 2 15" fill="none" />
      </g>

      {/* Character Group */}
      <g className="chibi-breathe" style={{ transformOrigin: "110px 194px" }}>
        {/* Connected Legs (from dress y=166 down to boots y=194) */}
        <path d="M96 166h10v22H96v-22Z" fill={C.skin} {...bodyStroke} />
        <path d="M114 166h10v22h-10v-22Z" fill={C.skin} {...bodyStroke} />
        {/* Socks */}
        <path d="M95 178h12v9H95v-9ZM113 178h12v9h-12v-9Z" fill={C.cream} {...thinStroke} />
        {/* Garden Boots */}
        <path d="M91 185c0-2 2-4 6-4h10c3 0 4 2 4 5v8H90c-2 0-2-6 1-9ZM112 185c0-2 2-4 6-4h10c3 0 5 2 5 5v8h-22v-9Z" fill={C.sageDeep} {...bodyStroke} />

        {/* Connected Left Shoulder, Arm & Hand holding woven flower basket */}
        <g>
          {/* Left arm curving from shoulder (94, 128) through basket handle to hand (80, 148) */}
          <path
            d="M95 128c-12 2-22 10-22 20 0 7 6 11 13 9l10-4"
            fill={C.skin}
            {...bodyStroke}
          />
          {/* Left puff sleeve */}
          <path d="M97 126c-8 0-14 5-15 13 5 4 11 4 17 0l-2-13Z" fill={C.cream} {...bodyStroke} />
          {/* Woven Basket */}
          <path d="M58 140c0-13 26-13 26 0" fill="none" {...bodyStroke} />
          <path d="M53 142c-1-3 3-5 10-5h16c7 0 11 2 10 5l-4 23c-8 4-20 4-28 0l-4-23Z" fill={C.kraft} {...bodyStroke} />
          <path d="M56 150h30M58 158h26" {...thinStroke} opacity="0.55" />
          {/* Flowers inside basket */}
          <Daisy x={64} y={134} s={0.55} fill={C.blush} />
          <Rose x={77} y={132} s={0.42} fill={C.cream} inner={C.rose} />
          {/* Left hand holding basket rim */}
          <circle cx="82" cy="144" r="5.5" fill={C.skin} {...bodyStroke} />
        </g>

        {/* Neck */}
        <path d="M103 116h14v14h-14v-14Z" fill={C.skin} {...bodyStroke} />

        {/* Dress & Apron */}
        <path d="M92 126c2-4 9-7 18-7s16 3 18 7l7 44c-14 6-36 6-50 0l7-44Z" fill={C.sage} {...bodyStroke} />
        <path d="M99 125c0-4 22-4 22 0l3 42c-9 4-19 4-28 0l3-42Z" fill={C.cream} {...thinStroke} />
        <path d="M96 142h28" {...thinStroke} />

        {/* Connected Right Shoulder, Arm, Hand & Scissors snipping stem */}
        <g className="chibi-snip" style={{ transformOrigin: "126px 130px" }}>
          <path
            d="M124 126c11 1 22-2 31-8 4-2 8 0 9 3 1 4-1 8-5 10-10 6-22 9-35 7v-12Z"
            fill={C.skin}
            {...bodyStroke}
          />
          {/* Right puff sleeve */}
          <path d="M123 125c8 0 14 5 15 12-5 4-11 4-17 1l2-13Z" fill={C.cream} {...bodyStroke} />
          {/* Hand holding shears */}
          <circle cx="160" cy="124" r="6" fill={C.skin} {...bodyStroke} />
          {/* Floristry Shears */}
          <g {...bodyStroke} strokeWidth={1.5}>
            <circle cx="163" cy="117" r="3.2" fill={C.cream} />
            <circle cx="163" cy="127" r="3.2" fill={C.cream} />
            <path d="M166 120l16-6M166 124l16 5" stroke={C.line} strokeWidth="1.8" />
          </g>
        </g>

        {/* Head & Straw Hat */}
        <g className="chibi-head-nod" style={{ transformOrigin: "110px 112px" }}>
          <ellipse cx="110" cy="94" rx="30" ry="27" fill={C.skin} {...bodyStroke} />
          <path
            d="M80 95c-3-21 10-33 30-33s33 12 30 34c-1 8-6 8-8 2-3-10-8-14-22-14s-19 4-22 14c-2 6-6 6-8-3Z"
            fill={C.hair}
            {...bodyStroke}
          />
          <path d="M83 89c-3 13-1 22 5 27-3-10-3-18-1-27M137 89c3 13 1 22-5 27 3-10 3-18 1-27" fill={C.hair} {...bodyStroke} />
          <g className="chibi-eyes">
            <ellipse cx="99" cy="96" rx="2.2" ry="3.1" fill={C.line} />
            <ellipse cx="121" cy="96" rx="2.2" ry="3.1" fill={C.line} />
            <circle cx="100" cy="94.5" r="0.9" fill={C.cream} />
            <circle cx="122" cy="94.5" r="0.9" fill={C.cream} />
          </g>
          <ellipse cx="90" cy="104" rx="5.4" ry="3" fill={C.cheek} opacity="0.65" />
          <ellipse cx="130" cy="104" rx="5.4" ry="3" fill={C.cheek} opacity="0.65" />
          <path d="M106 106c2 2.5 6 2.5 8 0" {...bodyStroke} />

          {/* Straw Sunhat */}
          <ellipse cx="110" cy="75" rx="46" ry="11" fill={C.kraft} {...bodyStroke} />
          <path d="M83 75c2-18 9-27 27-27s25 9 27 27" fill={C.cream} {...bodyStroke} />
          <path d="M85 68c16-4 34-4 50 0" stroke={C.roseDeep} strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>

      <Sparkle x={152} y={70} s={0.65} className="chibi-sparkle" />
      <Sparkle x={34} y={58} s={0.55} className="chibi-sparkle chibi-sparkle-2" />
    </svg>
  );
}

/* ============================================================================
   Process 02: Wrapping & tying the silk ribbon
   Chibi florist with connected legs, torso, shoulders, and both arms/hands
   tying the satin bow around a kraft-wrapped bouquet on a craft table.
   ============================================================================ */

export function ChibiRibbon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 215" fill="none" className={className} role="img" aria-label="Chibi thắt nơ cho bó hoa">
      <ellipse cx="120" cy="196" rx="92" ry="8" fill={C.sageLight} opacity="0.85" />

      {/* Chibi Florist standing on the left/center-left, connected legs & arms */}
      <g className="chibi-breathe" style={{ transformOrigin: "74px 194px" }}>
        {/* Connected Legs (from dress y=166 down to shoes y=194) */}
        <path d="M60 166h10v22H60v-22Z" fill={C.skin} {...bodyStroke} />
        <path d="M78 166h10v22H78v-22Z" fill={C.skin} {...bodyStroke} />
        <path d="M59 178h12v9H59v-9ZM77 178h12v9H77v-9Z" fill={C.cream} {...thinStroke} />
        <path d="M55 186c0-2 2-4 6-4h10c3 0 4 2 4 5v7H54c-2 0-2-5 1-8ZM76 186c0-2 2-4 6-4h10c3 0 4 2 4 5v7H75v-8Z" fill={C.sageDeep} {...bodyStroke} />

        {/* Neck */}
        <path d="M67 118h14v14H67v-14Z" fill={C.skin} {...bodyStroke} />

        {/* Dress & Apron */}
        <path d="M56 128c2-4 9-7 18-7s16 3 18 7l6 42c-14 6-34 6-48 0l6-42Z" fill={C.cream} {...bodyStroke} />
        <path d="M62 130c4-3 20-3 24 0l4 38c-10 4-22 4-32 0l4-38Z" fill={C.sage} {...bodyStroke} />
        <rect x="68" y="146" width="12" height="10" rx="2" fill={C.sageLight} {...thinStroke} />

        {/* Left Arm connected from left shoulder (58, 130) curving forward to hold bouquet wrap (106, 136) */}
        <path
          d="M58 130c-8 4-10 13-4 19 6 6 24 6 48 0l2-9c-20 4-33 4-38-1l-8-9Z"
          fill={C.skin}
          {...bodyStroke}
        />
        <path d="M60 128c-7 1-12 6-12 13 5 3 11 3 15-1l-3-12Z" fill={C.cream} {...bodyStroke} />

        {/* Head & Hair Bun */}
        <g className="chibi-head-nod" style={{ transformOrigin: "74px 116px" }}>
          <circle cx="50" cy="68" r="11" fill={C.hair} {...bodyStroke} />
          <path d="M44 74c4-4 10-5 15-2" stroke={C.rose} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="74" cy="96" rx="28" ry="26" fill={C.skin} {...bodyStroke} />
          <path
            d="M46 97c-3-20 9-31 28-31s31 11 28 32c-1 7-5 8-7 2-3-9-8-13-21-13s-18 4-21 13c-2 6-5 5-7-3Z"
            fill={C.hair}
            {...bodyStroke}
          />
          <g className="chibi-eyes">
            <ellipse cx="65" cy="97" rx="2.1" ry="3" fill={C.line} />
            <ellipse cx="85" cy="97" rx="2.1" ry="3" fill={C.line} />
            <circle cx="66" cy="95.5" r="0.9" fill={C.cream} />
            <circle cx="86" cy="95.5" r="0.9" fill={C.cream} />
          </g>
          <ellipse cx="56" cy="105" rx="5" ry="2.8" fill={C.cheek} opacity="0.65" />
          <ellipse cx="92" cy="105" rx="5" ry="2.8" fill={C.cheek} opacity="0.65" />
          <path d="M71 106c2 2.4 5.5 2.4 7.5 0" {...bodyStroke} />
        </g>
      </g>

      {/* Lush Bouquet & Kraft Paper Wrap (positioned at x=105..190 so hands directly touch the ribbon!) */}
      <g className="chibi-plant-sway" style={{ transformOrigin: "148px 175px" }}>
        {/* Stems & bottom kraft cone */}
        <path d="M134 166l-4 22h34l-4-22" fill={C.kraftDeep} {...bodyStroke} />
        {/* Foliage behind blooms */}
        <path d="M120 66c-14-11-24-5-28 6 10 4 20 1 28-6ZM176 58c14-12 24-7 28 4-10 5-20 2-28-4Z" fill={C.sage} {...thinStroke} />
        {/* Flowers */}
        <Rose x={148} y={66} s={0.92} fill={C.cream} inner={C.blush} />
        <Rose x={118} y={82} s={0.66} fill={C.blush} inner={C.rose} />
        <Rose x={178} y={78} s={0.7} fill={C.cream} inner={C.rose} />
        <Daisy x={166} y={48} s={0.62} fill={C.cream} />
        <Daisy x={128} y={46} s={0.54} fill={C.blush} />

        {/* Kraft Wrap Body */}
        <path d="M108 98h78l-14 70c-18 8-34 8-50 0l-14-70Z" fill={C.kraft} {...bodyStroke} />
        <path d="M118 104c9 15 11 35 7 58M174 104c-8 15-9 35-5 58" {...thinStroke} opacity="0.55" />

        {/* Ribbon Band & Flowing Bow */}
        <path d="M113 128c19 5 49 5 68 0l-2 11c-19 5-45 5-64 0l-2-11Z" fill={C.rose} {...bodyStroke} />
        <g stroke={C.line} strokeWidth="1.6" fill={C.blush}>
          <path d="M146 133c-12-9-23-4-21 6 2 7 13 5 21-6Z" />
          <path d="M148 133c12-9 23-4 21 6-2 7-13 5-21-6Z" />
          <path d="M145 136c-4 10-10 15-19 17 4-7 7-13 13-17M150 136c4 10 10 15 19 17-4-7-7-13-13-17Z" />
        </g>
        <circle cx="147" cy="134" r="4.2" fill={C.roseDeep} {...bodyStroke} />
      </g>

      {/* Right Arm & Both Hands connected in foreground tying the ribbon bow */}
      <g className="chibi-snip" style={{ transformOrigin: "90px 132px" }}>
        <path
          d="M86 128c14 2 28 3 42 5 4 0 6 3 6 6s-3 5-7 5c-15-1-30-3-43-7l2-9Z"
          fill={C.skin}
          {...bodyStroke}
        />
        <path d="M84 126c7 0 13 5 14 12-5 4-11 4-16 0l2-12Z" fill={C.cream} {...bodyStroke} />
        {/* Both connected hands right on the ribbon loops */}
        <circle cx="112" cy="142" r="5.5" fill={C.skin} {...bodyStroke} />
        <circle cx="131" cy="135" r="5.8" fill={C.skin} {...bodyStroke} />
      </g>

      <Heart x={198} y={62} s={0.55} fill={C.rose} className="animate-floaty" />
      <Sparkle x={206} y={104} s={0.65} className="chibi-sparkle" />
      <Sparkle x={30} y={62} s={0.55} className="chibi-sparkle chibi-sparkle-2" />
    </svg>
  );
}

/* ============================================================================
   Process 03: Flower delivery scooter (Giao nhanh 2 giờ)
   Completely connected rider: Head -> Neck -> Torso -> Seated Hip/Leg/Boot on
   floorboard, and Shoulder -> Sleeve -> Arm -> Hand gripping the handlebar!
   ============================================================================ */

export function ChibiScooter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 245 205" fill="none" className={className} role="img" aria-label="Chibi giao hoa bằng xe máy">
      {/* Road shadow & dashed motion line */}
      <ellipse cx="128" cy="184" rx="98" ry="7.5" fill={C.sageLight} opacity="0.85" />
      <path d="M16 179h212" stroke={C.sageDeep} strokeWidth="1.3" strokeLinecap="round" strokeDasharray="4 8" opacity="0.55" />

      {/* Speed breeze lines */}
      <g stroke={C.sage} strokeWidth="2" strokeLinecap="round" className="scooter-breeze">
        <path d="M10 116h24" />
        <path d="M6 134h18" />
        <path d="M18 96h14" />
      </g>

      {/* Entire Scooter + Rider assembly with gentle suspension bounce */}
      <g className="scooter-ride">
        {/* Rear Wheels & Front Wheels */}
        <g {...bodyStroke}>
          <circle cx="80" cy="160" r="19" fill={C.cream} />
          <circle cx="80" cy="160" r="12" fill={C.sageLight} />
          <circle cx="80" cy="160" r="4.5" fill={C.sageDeep} />
          <circle cx="186" cy="160" r="19" fill={C.cream} />
          <circle cx="186" cy="160" r="12" fill={C.sageLight} />
          <circle cx="186" cy="160" r="4.5" fill={C.sageDeep} />
        </g>

        {/* Rear flower crate mounted on rack */}
        <path d="M52 132h40" stroke={C.line} strokeWidth="3" strokeLinecap="round" />
        <rect x="44" y="96" width="44" height="36" rx="5" fill={C.kraft} {...bodyStroke} />
        <rect x="41" y="90" width="50" height="9" rx="3" fill={C.cream} {...bodyStroke} />
        <path d="M52 108h28v10H52z" fill={C.rose} {...thinStroke} />
        {/* Flowers in rear crate */}
        <Daisy x={51} y={80} s={0.58} fill={C.blush} />
        <Rose x={66} y={76} s={0.48} fill={C.cream} inner={C.rose} />
        <Daisy x={81} y={82} s={0.48} fill={C.cream} />

        {/* Connected Vespa Scooter Body Frame */}
        <path
          d="M64 156c4-18 16-28 36-28h28l4 22h28l12-46h12l-10 52H64Z"
          fill={C.sage}
          {...bodyStroke}
        />
        {/* Front fender & leg shield */}
        <path d="M168 156c6-12 18-16 30-10" fill={C.sageDeep} {...bodyStroke} />
        {/* Cushioned Saddle */}
        <rect x="98" y="120" width="38" height="11" rx="5.5" fill={C.roseDeep} {...bodyStroke} />
        {/* Steering column, handlebar & headlight */}
        <path d="M170 104l4-10h12" stroke={C.line} strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="188" cy="100" r="5.5" fill={C.gold} {...bodyStroke} />
        {/* Front flower basket */}
        <path d="M184 110h24l-3 16h-18l-3-16Z" fill={C.kraft} {...bodyStroke} />
        <Daisy x={191} y={104} s={0.42} fill={C.blush} />
        <Rose x={202} y={103} s={0.36} fill={C.cream} inner={C.rose} />

        {/* Connected Rider Sitting on Saddle */}
        {/* Flowing scarf trailing behind neck */}
        <path d="M120 92c-16-4-30 2-38 13 12-2 22 0 32 6l6-19Z" fill={C.rose} {...bodyStroke} />

        {/* Connected Leg: Hip on saddle (120, 122) -> Knee (144, 130) -> Lower leg -> Boot on floorboard (144, 152) */}
        <path
          d="M116 120h18c10 2 16 8 16 16l-2 14h-11l1-12c0-4-4-7-10-7h-12v-11Z"
          fill={C.skin}
          {...bodyStroke}
        />
        {/* Rider Boot resting on scooter floorboard */}
        <path d="M135 148h16c3 0 5 2 5 5v3h-21v-8Z" fill={C.sageDeep} {...bodyStroke} />

        {/* Connected Torso / Jacket sitting on saddle */}
        <path d="M112 92c2-4 8-6 15-6s13 2 15 6l4 30c-10 4-26 4-36 0l2-30Z" fill={C.cream} {...bodyStroke} />
        <path d="M116 94c3-2 18-2 21 0l3 27c-8 3-19 3-27 0l3-27Z" fill={C.sageDeep} {...thinStroke} />

        {/* Connected Neck (122..134, y=82..94) */}
        <path d="M122 82h12v12h-12V82Z" fill={C.skin} {...bodyStroke} />

        {/* Connected Shoulder, Sleeve, Forearm & Hand gripping handlebar (172, 96) */}
        <path
          d="M132 94c10 2 22 3 36 1 4-1 7 2 7 5s-3 6-7 6c-15 2-29 1-40-3l4-9Z"
          fill={C.skin}
          {...bodyStroke}
        />
        <path d="M130 92c7 0 12 4 13 10-4 3-10 4-15 1l2-11Z" fill={C.cream} {...bodyStroke} />
        <circle cx="173" cy="99" r="5.5" fill={C.skin} {...bodyStroke} />

        {/* Connected Rider Head & Delivery Cap */}
        <ellipse cx="130" cy="66" rx="24" ry="22" fill={C.skin} {...bodyStroke} />
        <path
          d="M106 67c-2-16 8-25 24-25s25 9 23 26c-1 6-5 6-6 1-2-8-6-11-17-11s-14 3-17 11c-1 5-5 4-7-2Z"
          fill={C.hair}
          {...bodyStroke}
        />
        {/* Helmet / Cap */}
        <path d="M106 56c2-12 11-19 24-19 14 0 23 7 24 19l-4 5h-42l-2-5Z" fill={C.rose} {...bodyStroke} />
        <path d="M142 56c8 0 14 2 15 5-2 3-10 3-18 1" fill={C.blush} {...thinStroke} />
        <g className="chibi-eyes">
          <ellipse cx="123" cy="68" rx="1.9" ry="2.8" fill={C.line} />
          <ellipse cx="139" cy="68" rx="1.9" ry="2.8" fill={C.line} />
        </g>
        <ellipse cx="116" cy="74" rx="4.5" ry="2.5" fill={C.cheek} opacity="0.65" />
        <ellipse cx="145" cy="74" rx="4.5" ry="2.5" fill={C.cheek} opacity="0.65" />
        <path d="M127 75c2 2.2 5 2.2 7 0" {...bodyStroke} />
      </g>

      <Heart x={214} y={76} s={0.5} fill={C.blush} className="animate-floaty" />
      <Sparkle x={206} y={54} s={0.6} className="chibi-sparkle" />
      <Sparkle x={30} y={64} s={0.55} className="chibi-sparkle chibi-sparkle-3" />
    </svg>
  );
}

/* ============================================================================
   Process 04 & FAQ: Handing over the flowers to a loved one
   Both chibi characters have full connected legs, shoes, necks, shoulders,
   sleeves, and connected hands holding/receiving the bouquet together!
   ============================================================================ */

export function ChibiGift({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 245 205" fill="none" className={className} role="img" aria-label="Chibi trao bó hoa cho người thương">
      <ellipse cx="122" cy="188" rx="96" ry="7.5" fill={C.sageLight} opacity="0.85" />

      {/* Left Character: Florist Giver */}
      <g className="chibi-breathe" style={{ transformOrigin: "64px 186px" }}>
        {/* Connected Legs (y=160..186) */}
        <path d="M51 160h9v20h-9v-20Z" fill={C.skin} {...bodyStroke} />
        <path d="M68 160h9v20h-9v-20Z" fill={C.skin} {...bodyStroke} />
        <path d="M47 178c0-2 2-4 5-4h9c3 0 4 2 4 5v6H46c-2 0-1-5 1-7ZM66 178c0-2 2-4 5-4h9c3 0 4 2 4 5v6H65v-7Z" fill={C.sageDeep} {...bodyStroke} />

        {/* Neck */}
        <path d="M57 114h14v13H57v-13Z" fill={C.skin} {...bodyStroke} />

        {/* Dress & Apron */}
        <path d="M46 124c2-4 9-7 18-7s16 3 18 7l6 40c-14 5-34 5-48 0l6-40Z" fill={C.cream} {...bodyStroke} />
        <path d="M52 126c4-3 20-3 24 0l4 36c-10 4-22 4-32 0l4-36Z" fill={C.sage} {...bodyStroke} />

        {/* Head */}
        <ellipse cx="64" cy="92" rx="27" ry="25" fill={C.skin} {...bodyStroke} />
        <path
          d="M37 93c-3-20 9-31 27-31s30 11 27 32c-1 7-5 8-7 2-3-9-8-13-20-13s-17 4-20 13c-2 6-5 5-7-3Z"
          fill={C.hair}
          {...bodyStroke}
        />
        <g className="chibi-eyes">
          <ellipse cx="55" cy="94" rx="2" ry="2.9" fill={C.line} />
          <ellipse cx="74" cy="94" rx="2" ry="2.9" fill={C.line} />
        </g>
        <ellipse cx="47" cy="102" rx="4.8" ry="2.7" fill={C.cheek} opacity="0.65" />
        <ellipse cx="82" cy="102" rx="4.8" ry="2.7" fill={C.cheek} opacity="0.65" />
        <path d="M60 103c2 2.4 5.5 2.4 7.5 0" {...bodyStroke} />

        {/* Connected Left & Right Arms extending forward to hold bouquet (x=80..114) */}
        <path
          d="M78 126c10 1 20 4 30 8 4 1 5 4 4 7-1 3-5 4-9 3-10-3-19-6-27-9l2-9Z"
          fill={C.skin}
          {...bodyStroke}
        />
        <path d="M76 124c6 0 11 4 12 10-4 3-9 3-14 0l2-10Z" fill={C.cream} {...bodyStroke} />
      </g>

      {/* Right Character: Happy Recipient */}
      <g className="chibi-breathe" style={{ transformOrigin: "178px 186px", animationDelay: "0.6s" }}>
        {/* Connected Legs (y=160..186) */}
        <path d="M165 160h9v20h-9v-20Z" fill={C.skin} {...bodyStroke} />
        <path d="M182 160h9v20h-9v-20Z" fill={C.skin} {...bodyStroke} />
        <path d="M161 178c0-2 2-4 5-4h9c3 0 4 2 4 5v6h-19v-7ZM180 178c0-2 2-4 5-4h9c3 0 4 2 4 5v6h-19v-7Z" fill={C.roseDeep} {...bodyStroke} />

        {/* Neck */}
        <path d="M171 114h14v13h-14v-13Z" fill={C.skin} {...bodyStroke} />

        {/* Dress */}
        <path d="M160 124c2-4 9-7 18-7s16 3 18 7l6 40c-14 5-34 5-48 0l6-40Z" fill={C.rose} {...bodyStroke} />
        <path d="M166 126c4-3 20-3 24 0l3 36c-9 4-21 4-30 0l3-36Z" fill={C.cream} {...thinStroke} />

        {/* Head & Hair Bun */}
        <circle cx="201" cy="70" r="10" fill={C.hair} {...bodyStroke} />
        <ellipse cx="178" cy="92" rx="27" ry="25" fill={C.skin} {...bodyStroke} />
        <path
          d="M151 93c-3-20 9-31 27-31s30 11 27 32c-1 7-5 8-7 2-3-9-8-13-20-13s-17 4-20 13c-2 6-5 5-7-3Z"
          fill={C.hair}
          {...bodyStroke}
        />
        <g className="chibi-eyes">
          <ellipse cx="168" cy="94" rx="2" ry="2.9" fill={C.line} />
          <ellipse cx="187" cy="94" rx="2" ry="2.9" fill={C.line} />
        </g>
        <ellipse cx="160" cy="102" rx="4.8" ry="2.7" fill={C.cheek} opacity="0.65" />
        <ellipse cx="195" cy="102" rx="4.8" ry="2.7" fill={C.cheek} opacity="0.65" />
        <path d="M174 103c2 2.5 5.5 2.5 7.5 0" {...bodyStroke} />

        {/* Connected Arms reaching out to receive the bouquet */}
        <path
          d="M164 126c-10 1-20 4-30 8-4 1-5 4-4 7 1 3 5 4 9 3 10-3 19-6 27-9l-2-9Z"
          fill={C.skin}
          {...bodyStroke}
        />
        <path d="M166 124c-6 0-11 4-12 10 4 3 9 3 14 0l-2-10Z" fill={C.cream} {...bodyStroke} />
      </g>

      {/* Shared Bouquet held right between both characters' connected hands (x=108..136, y=118..162) */}
      <g className="animate-floaty" style={{ transformOrigin: "121px 140px" }}>
        <Rose x={121} y={120} s={0.58} fill={C.cream} inner={C.rose} />
        <Daisy x={108} y={124} s={0.48} fill={C.blush} />
        <Daisy x={134} y={124} s={0.45} fill={C.cream} />
        <path d="M109 130h24l-5 28c-4 2-10 2-14 0l-5-28Z" fill={C.kraft} {...bodyStroke} />
        <path d="M112 142h18" stroke={C.roseDeep} strokeWidth="3" strokeLinecap="round" />
        {/* Connected Hands holding the bouquet */}
        <circle cx="110" cy="138" r="5" fill={C.skin} {...bodyStroke} />
        <circle cx="132" cy="138" r="5" fill={C.skin} {...bodyStroke} />
      </g>

      {/* Floating Hearts & Sparkles */}
      <Heart x={121} y={84} s={0.85} fill={C.rose} className="heart-float" />
      <Heart x={100} y={66} s={0.5} fill={C.blush} className="heart-float-delayed" />
      <Sparkle x={144} y={62} s={0.65} className="chibi-sparkle" />
      <Sparkle x={212} y={88} s={0.55} className="chibi-sparkle chibi-sparkle-2" />
    </svg>
  );
}

/* ============================================================================
   About: Chibi Portrait of Mộc, the gardener — waving warmly
   Connected shoulders, puff sleeves, left forearm/hand cradling a rose,
   and right forearm/hand waving from a connected elbow joint!
   ============================================================================ */

export function ChibiPortrait({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 330" fill="none" className={className} role="img" aria-label="Chân dung chibi của Mộc, người giữ vườn">
      {/* Background botanical leaves & blooms */}
      <path
        d="M42 284c-26-16-33-44-22-64 21 12 28 36 22 64ZM262 268c24-14 30-40 20-58-19 11-25 32-20 58Z"
        fill={C.sageLight}
        opacity="0.7"
        {...thinStroke}
      />
      <Daisy x={258} y={118} s={0.9} fill={C.cream} />
      <Rose x={36} y={216} s={0.62} fill={C.blush} inner={C.rose} />

      {/* Back Hair */}
      <path
        d="M74 148c-6-60 24-100 76-100s84 39 78 101c-3 31-10 53-21 71l-9-8c5-20 7-40 4-56-6 26-15 44-31 56-16-12-25-30-29-56-2 22 0 42 5 60l-11 8c-11-22-17-45-18-66-4 12-7 25-8 38-7-13-12-26-16-48Z"
        fill={C.hair}
        {...bodyStroke}
      />

      {/* Connected Neck (x=132..168, y=210..256) */}
      <path d="M132 210h36v46h-36v-46Z" fill={C.skin} {...bodyStroke} />
      <path d="M134 228c9 6 23 6 32 0" stroke={C.skinShade} strokeWidth="2.2" strokeLinecap="round" />

      {/* Connected Torso, Puff Sleeves & Florist Pinafore Dress (y=248..330) */}
      <path d="M64 330c4-48 32-82 86-82s82 34 86 82H64Z" fill={C.cream} {...bodyStroke} />
      {/* Collar */}
      <path d="M124 250c8 10 44 10 52 0" fill={C.cream} {...bodyStroke} />
      {/* Sage Pinafore Apron */}
      <path d="M114 252v20M186 252v20" stroke={C.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M108 268h84l10 62H98l10-62Z" fill={C.sage} {...bodyStroke} />
      <rect x="136" y="286" width="28" height="22" rx="4" fill={C.sageLight} {...thinStroke} />
      <Heart x={150} y={299} s={0.55} fill={C.roseDeep} />

      {/* Left Arm & Hand (connected smoothly from left shoulder/sleeve x=74..108, cradling a Juliet rose) */}
      <g>
        {/* Left Puff Sleeve */}
        <path d="M98 256c-18 6-30 22-32 44 14 6 28 4 38-6l-6-38Z" fill={C.cream} {...bodyStroke} />
        {/* Connected Forearm & Hand resting across waist holding a rose */}
        <path
          d="M74 294c10 12 28 16 52 12 6-1 10-5 9-10-1-5-6-8-12-7-16 2-28 0-36-7l-13 12Z"
          fill={C.skin}
          {...bodyStroke}
        />
        <circle cx="126" cy="296" r="8" fill={C.skin} {...bodyStroke} />
        {/* Stem & Rose held in left hand */}
        <path d="M118 268l12 42" stroke={C.sageDeep} strokeWidth="2.4" strokeLinecap="round" />
        <Rose x={115} y={264} s={0.48} fill={C.rose} inner={C.blush} />
      </g>

      {/* Right Arm & Waving Hand (connected from right shoulder x=202, pivoting at elbow 216, 278) */}
      <g>
        {/* Right Upper Arm & Puff Sleeve connected to torso */}
        <path d="M202 256c16 5 26 18 30 36-12 7-26 6-36-4l6-32Z" fill={C.cream} {...bodyStroke} />
        {/* Waving Forearm + Hand pivoting at elbow (218, 278) */}
        <g className="chibi-wave" style={{ transformOrigin: "218px 278px" }}>
          <path
            d="M210 278c10-12 18-28 22-44 2-8 8-12 14-10 6 2 9 9 6 18-5 19-14 36-26 48-6 5-14 2-16-4v-8Z"
            fill={C.skin}
            {...bodyStroke}
          />
          {/* Connected Waving Palm & Cute Fingers */}
          <circle cx="242" cy="226" r="11" fill={C.skin} {...bodyStroke} />
          <path d="M235 218l-2-7M241 216v-8M247 217l3-7M251 223l6-4" {...bodyStroke} />
          {/* Sleeve cuff overlapping elbow joint so it always looks seamless */}
          <ellipse cx="218" cy="280" rx="13" ry="7" transform="rotate(-25 218 280)" fill={C.cream} {...bodyStroke} />
        </g>
      </g>

      {/* Head, Ears & Face */}
      <g className="chibi-head-nod" style={{ transformOrigin: "150px 210px" }}>
        <ellipse cx="79" cy="154" rx="9" ry="12" fill={C.skin} {...bodyStroke} />
        <ellipse cx="221" cy="154" rx="9" ry="12" fill={C.skin} {...bodyStroke} />
        <ellipse cx="150" cy="148" rx="72" ry="66" fill={C.skin} {...bodyStroke} />

        {/* Front Hair Fringe */}
        <path
          d="M82 130c4-34 29-49 68-49s64 15 68 49c-11-15-25-21-41-19-12 7-42 8-55 0-16-2-30 5-40 19Z"
          fill={C.hair}
          {...bodyStroke}
        />
        <path d="M111 92c13-12 30-16 48-13M95 104c3-4 7-7 11-9" stroke={C.hairLight} strokeWidth="1.6" strokeLinecap="round" />

        {/* Side hair framing cheeks */}
        <path
          d="M84 142c-5 24-2 44 8 58 2-15 6-26 12-34-5-9-6-17-5-27M216 142c5 24 2 44-8 58-2-15-6-26-12-34 5-9 6-17 5-27"
          fill={C.hair}
          {...bodyStroke}
        />

        {/* Happy smiling eyes & rosy cheeks */}
        <g className="chibi-eyes">
          <path d="M118 156c3-5 9-5 12 0" stroke={C.line} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M170 156c3-5 9-5 12 0" stroke={C.line} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </g>
        <path d="M115 144c3-3 7-4 10-2M185 144c-3-3-7-4-10-2" {...thinStroke} />
        <ellipse cx="108" cy="168" rx="9.5" ry="4.8" fill={C.cheek} opacity="0.72" />
        <ellipse cx="192" cy="168" rx="9.5" ry="4.8" fill={C.cheek} opacity="0.72" />
        <path d="M140 171c4 5 16 5 20 0" {...bodyStroke} />

        {/* Flower clips in hair */}
        <Daisy x={209} y={112} s={1} fill={C.cream} />
        <Rose x={225} y={134} s={0.46} fill={C.blush} inner={C.rose} />
        <path d="M198 120c-8-4-15-3-20 3 7 2 13 1 20-3Z" fill={C.sage} {...thinStroke} />

        {/* Pearl earring */}
        <path d="M221 166v7" {...thinStroke} />
        <circle cx="221" cy="176" r="3.2" fill={C.gold} {...thinStroke} />
      </g>

      <Sparkle x={62} y={108} s={0.8} className="chibi-sparkle" />
      <Sparkle x={256} y={192} s={0.7} className="chibi-sparkle chibi-sparkle-2" />
      <Sparkle x={46} y={248} s={0.6} className="chibi-sparkle chibi-sparkle-3" />
    </svg>
  );
}

/* ---------------- Mini faces for social proof & reviews ---------------- */

export function MiniAvatar({ variant = 0, className }: { variant?: number; className?: string }) {
  const skins = [C.skin, "#f3d8c4", "#fae9db"];
  const hairs = [C.hair, "#695343", "#3a3530"];
  const shirts = [C.sage, C.rose, C.cream];
  const skin = skins[variant % 3];
  const hair = hairs[variant % 3];
  const shirt = shirts[variant % 3];
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill={C.sageLight} />
      {/* Connected neck + shoulders */}
      <path d="M20 29h8v6h-8v-6Z" fill={skin} stroke={C.line} strokeWidth="1.2" />
      <path d="M8 48c1-10 7-15 16-15s15 5 16 15H8Z" fill={shirt} stroke={C.line} strokeWidth="1.3" />
      <ellipse cx="24" cy="20" rx="12" ry="11.5" fill={skin} stroke={C.line} strokeWidth="1.3" />
      <path
        d="M11 20c-1-10 5-15 13-15s14 5 13 15c-1 4-3 4-4 1-1-5-4-7-9-7s-8 2-9 7c-1 3-3 3-4-1Z"
        fill={hair}
        stroke={C.line}
        strokeWidth="1.2"
      />
      {variant === 1 && <ellipse cx="35" cy="12" rx="4.4" ry="4" fill={hair} stroke={C.line} strokeWidth="1.2" />}
      {variant === 2 && (
        <g>
          <circle cx="35" cy="11" r="2.2" fill={C.blush} stroke={C.line} strokeWidth="0.9" />
          <circle cx="39" cy="13" r="2.2" fill={C.cream} stroke={C.line} strokeWidth="0.9" />
          <circle cx="36" cy="15" r="2" fill={C.rose} stroke={C.line} strokeWidth="0.9" />
        </g>
      )}
      <ellipse cx="19.5" cy="21" rx="1.1" ry="1.5" fill={C.line} />
      <ellipse cx="28.5" cy="21" rx="1.1" ry="1.5" fill={C.line} />
      <ellipse cx="16" cy="24.5" rx="2.4" ry="1.3" fill={C.cheek} opacity="0.7" />
      <ellipse cx="32" cy="24.5" rx="2.4" ry="1.3" fill={C.cheek} opacity="0.7" />
      <path d="M21 25c1.4 1.7 4.6 1.7 6 0" stroke={C.line} strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ---------------- Decorative pieces ---------------- */

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 11c24-8 42 3 63-2 22-5 34-6 56 0 20 6 40-1 58-3 18-2 35 3 57 1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="squiggle-draw"
      />
    </svg>
  );
}

export function CircularStamp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 124 124" fill="none" className={className} aria-hidden="true">
      <defs>
        <path id="stamp-circle-path" d="M62,62 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <circle cx="62" cy="62" r="61" fill={C.cream} />
      <circle cx="62" cy="62" r="58" stroke={C.line} strokeWidth="1" strokeDasharray="2 5" opacity="0.65" />
      <circle cx="62" cy="62" r="33" fill={C.blush} opacity="0.55" />
      <g className="slow-spin" style={{ transformOrigin: "62px 62px" }}>
        <text fill={C.line} fontSize="8.4" fontFamily="'Baloo 2', sans-serif" letterSpacing="2.05" fontWeight="500">
          <textPath href="#stamp-circle-path" startOffset="0">
            HOA TƯƠI MỖI NGÀY · GIAO TRONG 2 GIỜ ·
          </textPath>
        </text>
      </g>
      <g stroke={C.roseDeep} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="62" cy="56" r="4.6" />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="62" cy="45" rx="5.6" ry="7.2" transform={`rotate(${a} 62 56)`} />
        ))}
        <path d="M62 66v16M62 73c-6 0-9-3-10-8 6-1 9 2 10 8ZM62 78c5 0 8-3 9-7-5-1-8 2-9 7Z" />
      </g>
    </svg>
  );
}
