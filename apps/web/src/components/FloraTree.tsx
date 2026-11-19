import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type FloraTreeProps = {
  /** Nội dung đặt bên trái cây đào */
  children: ReactNode;
  /** Ô nhập tên để cánh hoa rơi xếp thành chữ */
  showNameInput?: boolean;
  /** Độ rộng khung nội dung bên trái */
  contentWidth?: string;
  /** Dòng chữ nhỏ dưới tên do cánh hoa ghép */
  caption?: string;
  /** Tên mặc định cánh hoa ghép */
  defaultName?: string;
};

type Branch = {
  pts: [number, number][];
  s?: [number, number][];
  cum: number[];
  w0: number;
  w1: number;
  depth: number;
  t0: number;
  dur: number;
  tip: boolean;
};

type Blossom = {
  ux: number;
  uy: number;
  size: number;
  rot: number;
  back: boolean;
  v: number;
  al: number;
  pop: number;
  hp: number;
  regrowAt: number;
  x: number;
  y: number;
};

type TargetPoint = {
  x: number;
  y: number;
  rot: number;
  k: number;
  p: Petal | null;
};

type Petal = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  fl: number;
  fs: number;
  fw: number;
  fa: number;
  fall: number;
  size: number;
  spr: number;
  land: number;
  age?: number;
  gone?: number;
  t?: TargetPoint | null;
  gs?: number;
  dur?: number;
  sx?: number;
  sy?: number;
  srot?: number;
};

const SAKURA_HUE = 345;

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
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

function mk(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.floor(w));
  c.height = Math.max(1, Math.floor(h));
  return c;
}

function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

export function FloraTree({ children, showNameInput = false, contentWidth = "max-w-[580px]", caption = "mỗi cánh hoa rơi là một lời yêu thương gửi tới người nhận", defaultName = "Florea" }: FloraTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [customName, setCustomName] = useState(defaultName);

  const stateRef = useRef({
    name: defaultName,
  });
  const captionRef = useRef(caption);
  captionRef.current = caption;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;

    const CONFIG = {
      name: stateRef.current.name,
      blossoms: 3800,
      grow: 2.3,
      petalsInName: 430,
      shed: 120, // rụng nhanh để chữ ghép xong trong vài giây
      writeSpeed: 180,
      seed: 24,
      hue: SAKURA_HUE,
    };

    let branches: Branch[] = [];
    let blossoms: Blossom[] = [];
    const blossomSpr: HTMLCanvasElement[] = [];
    const petalSpr: HTMLCanvasElement[] = [];
    const flying: Petal[] = [];
    const settled: Petal[] = [];
    let targets: TargetPoint[] = [];
    let nextT = 0;
    let nameBox: { cx: number; cy: number; h: number; gs: number } | null = null;

    let DPR = 1;
    let W = 0;
    let H = 0;
    let S = 1;
    let OX = 0;
    let OY = 0;
    let horizon = 0;
    let baseY = 0;

    let bg: HTMLCanvasElement | null = null;
    let wash: HTMLCanvasElement | null = null;
    let grain: HTMLCanvasElement | null = null;
    let treeCache: HTMLCanvasElement | null = null;

    let t0: number | null = null;
    let last = 0;
    let curSec = 0;
    let wind = 0;
    let filled = 0;
    let quota = 0;
    let rafId = 0;

    const ptr = {
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      down: false,
      seen: false,
      vx: 0,
      vy: 0,
      trail: [] as { x: number; y: number; t: number }[],
      moved: false,
    };

    function buildTreeAndBlossoms() {
      branches = [];
      blossoms = [];
      const r = seeded(CONFIG.seed);

      function grow(x: number, y: number, a: number, len: number, w: number, depth: number, startT: number) {
        const n = 6;
        const pts: [number, number][] = [[x, y]];
        let ang = a;
        const bend = depth >= 3 ? (a > 0 ? 1 : -1) * 0.05 : 0;
        for (let i = 1; i < n; i++) {
          ang += (r() - 0.5) * 0.32 + bend;
          x += (Math.sin(ang) * len) / (n - 1);
          y -= (Math.cos(ang) * len) / (n - 1);
          pts.push([x, y]);
        }
        const w1 = w * 0.7;
        const dur = len / (230 - depth * 12);
        const b: Branch = { pts, cum: [0], w0: w, w1, depth, t0: startT, dur, tip: false };
        branches.push(b);
        if (depth >= 8 || w1 < 0.55) {
          b.tip = true;
          return;
        }
        const kids = depth < 2 && r() < 0.5 ? 3 : 2;
        const spread = depth < 3 ? 0.5 + r() * 0.3 : 0.32 + r() * 0.32;
        for (let k = 0; k < kids; k++) {
          const side = kids === 2 ? (k ? 1 : -1) : k - 1;
          const heavy = (side < 0) === (r() < 0.5);
          grow(
            x,
            y,
            ang + side * spread * (0.75 + r() * 0.5) + (r() - 0.5) * 0.15,
            len * (0.7 + r() * 0.16),
            w1 * (heavy ? 0.82 : 0.68),
            depth + 1,
            startT + dur
          );
        }
        if (depth >= 1 && r() < 0.6) {
          const f = 0.45 + r() * 0.3;
          const p = pts[Math.round(f * (n - 1))];
          const s = r() < 0.5 ? -1 : 1;
          grow(p[0], p[1], a + s * (0.75 + r() * 0.45), len * 0.5, w * 0.45, depth + 2, startT + dur * f);
        }
      }

      grow(0, 6, -0.08, 100, 27, 0, 0);
      let end = 0;
      for (const b of branches) end = Math.max(end, b.t0 + b.dur);
      const k = CONFIG.grow / end;
      for (const b of branches) {
        b.t0 = 0.15 + b.t0 * k;
        b.dur *= k;
        b.cum = [0];
        for (let i = 1; i < b.pts.length; i++) {
          b.cum.push(b.cum[i - 1] + Math.hypot(b.pts[i][0] - b.pts[i - 1][0], b.pts[i][1] - b.pts[i - 1][1]));
        }
      }

      const r2 = seeded(CONFIG.seed * 7 + 1);
      const host = branches.filter((b) => b.depth >= 4);
      let wsum = 0;
      const wt = host.map((b) => (wsum += b.cum[b.cum.length - 1] * (b.tip ? 1.8 : 1)));
      for (let i = 0; i < CONFIG.blossoms; i++) {
        const v = r2() * wsum;
        let j = 0;
        while (wt[j] < v && j < host.length - 1) j++;
        const b = host[j];
        const f = b.tip ? Math.pow(r2(), 0.55) : r2();
        const L = b.cum[b.cum.length - 1] * f;
        let s = 1;
        while (s < b.cum.length - 1 && b.cum[s] < L) s++;
        const u = (L - b.cum[s - 1]) / (b.cum[s] - b.cum[s - 1] || 1);
        const p0 = b.pts[s - 1];
        const p1 = b.pts[s];
        const spread = 4 + b.depth * 1.4;
        const gx = (r2() + r2() + r2() - 1.5) * spread;
        const gy = (r2() + r2() + r2() - 1.5) * spread;
        const endT = b.t0 + b.dur * f;
        blossoms.push({
          ux: lerp(p0[0], p1[0], u) + gx,
          uy: lerp(p0[1], p1[1], u) + gy - 2,
          size: 2.9 + Math.pow(r2(), 1.6) * 3.8,
          rot: r2() * 6.283,
          back: r2() < 0.34,
          v: (r2() * 4) | 0,
          al: 0.74 + r2() * 0.26,
          pop: Math.max(endT + 0.1, 1.0) + Math.pow(r2(), 1.4) * 1.1,
          hp: 3,
          regrowAt: 0,
          x: 0,
          y: 0,
        });
      }
      let top = 0;
      let bot = -1e9;
      for (const f of blossoms) {
        top = Math.min(top, f.uy);
        bot = Math.max(bot, f.uy);
      }
      for (const f of blossoms) {
        const h = (f.uy - top) / (bot - top || 1);
        if (!f.back) {
          f.v = h > 0.62 + r2() * 0.3 ? 2 : h < 0.25 + r2() * 0.3 ? (r2() < 0.5 ? 3 : 1) : (r2() * 4) | 0;
        }
      }
      blossoms.sort((a, b) => (a.back === b.back ? a.uy - b.uy : a.back ? -1 : 1));
    }

    function makeSprites() {
      blossomSpr.length = 0;
      petalSpr.length = 0;
      const h = SAKURA_HUE;
      const Z = 64;
      for (let k = 0; k < 6; k++) {
        const c = mk(Z, Z);
        const x = c.getContext("2d")!;
        const back = k >= 4;
        const rr = Z * 0.46;
        const L = back ? [56, 64][k - 4] : [84, 89, 76, 92][k];
        const sat = back ? 30 : [70, 76, 58, 62][k];
        x.translate(Z / 2, Z / 2);
        x.rotate(k);
        for (let i = 0; i < 5; i++) {
          x.save();
          x.rotate(i * 1.2566 + (i % 2) * 0.08);
          const gr = x.createRadialGradient(0, 0, 0, 0, -rr * 0.5, rr * 0.75);
          gr.addColorStop(0, hsl(h - 8, sat + 10, L - 22));
          gr.addColorStop(0.45, hsl(h, sat, L - 4));
          gr.addColorStop(1, hsl(h + 6, sat - 10, Math.min(97, L + 6)));
          x.fillStyle = gr;
          x.beginPath();
          x.moveTo(0, 0);
          x.bezierCurveTo(-rr * 0.62, -rr * 0.22, -rr * 0.66, -rr * 0.96, -rr * 0.14, -rr);
          x.lineTo(0, -rr * 0.86);
          x.lineTo(rr * 0.14, -rr);
          x.bezierCurveTo(rr * 0.66, -rr * 0.96, rr * 0.62, -rr * 0.22, 0, 0);
          x.fill();
          x.strokeStyle = hsl(h - 4, 40, back ? 34 : 58, 0.35);
          x.lineWidth = 1.2;
          x.stroke();
          x.restore();
        }
        x.fillStyle = hsl(h - 14, 70, back ? 26 : 38);
        x.beginPath();
        x.arc(0, 0, rr * 0.16, 0, 7);
        x.fill();
        for (let i = 0; i < 11; i++) {
          const a = i * 0.571;
          const l = rr * (0.3 + (i % 3) * 0.06);
          x.strokeStyle = hsl(h - 10, 50, back ? 40 : 62, 0.8);
          x.lineWidth = 1;
          x.beginPath();
          x.moveTo(0, 0);
          x.lineTo(Math.cos(a) * l, Math.sin(a) * l);
          x.stroke();
          x.fillStyle = back ? "#9a7a6a" : "#f2d9a6";
          x.beginPath();
          x.arc(Math.cos(a) * l, Math.sin(a) * l, 1.5, 0, 7);
          x.fill();
        }
        blossomSpr.push(c);
      }
      for (let k = 0; k < 4; k++) {
        const c = mk(32, 32);
        const x = c.getContext("2d")!;
        const L = [88, 82, 92, 76][k];
        x.translate(16, 16);
        const gr = x.createLinearGradient(0, 13, 0, -13);
        gr.addColorStop(0, hsl(h - 8, 70, L - 16));
        gr.addColorStop(1, hsl(h + 4, 70, Math.min(97, L + 6)));
        x.fillStyle = gr;
        x.beginPath();
        x.moveTo(0, 13);
        x.bezierCurveTo(-11, 5, -10, -11, -3, -13);
        x.lineTo(0, -10);
        x.lineTo(3, -13);
        x.bezierCurveTo(10, -11, 11, 5, 0, 13);
        x.fill();
        x.strokeStyle = hsl(h, 40, 55, 0.3);
        x.lineWidth = 1;
        x.stroke();
        petalSpr.push(c);
      }
    }

    function paintBackdrop() {
      bg = mk(W * DPR, H * DPR);
      const x = bg.getContext("2d")!;
      x.scale(DPR, DPR);
      const sky = x.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#151a36");
      sky.addColorStop(0.38, "#3a2f55");
      sky.addColorStop(0.7, "#9b5c78");
      sky.addColorStop(0.9, "#d8897c");
      sky.addColorStop(1, "#efb08a");
      x.fillStyle = sky;
      x.fillRect(0, 0, W, horizon + 2);
      const r = seeded(9);
      for (let i = 0; i < 95; i++) {
        const sy = Math.pow(r(), 1.8) * horizon * 0.55;
        x.fillStyle = `rgba(255,240,235,${(0.15 + r() * 0.55) * (1 - sy / (horizon * 0.55))})`;
        x.beginPath();
        x.arc(r() * W, sy, r() * 0.9 + 0.25, 0, 7);
        x.fill();
      }
      const mx = W >= 960 ? W * 0.46 : W * 0.78;
      const my = Math.min(H * 0.2, 135);
      const mr = Math.max(18, Math.min(W, H) * 0.042);
      const halo = x.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 6);
      halo.addColorStop(0, "rgba(255,236,220,.32)");
      halo.addColorStop(1, "rgba(255,236,220,0)");
      x.fillStyle = halo;
      x.fillRect(0, 0, W, horizon);
      const mg = x.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);
      mg.addColorStop(0, "#fff8ee");
      mg.addColorStop(1, "#f1dfcf");
      x.fillStyle = mg;
      x.beginPath();
      x.arc(mx, my, mr, 0, 7);
      x.fill();
      for (let i = 0; i < 7; i++) {
        x.fillStyle = `rgba(200,170,170,${0.08 + r() * 0.08})`;
        x.beginPath();
        x.arc(mx + (r() - 0.5) * mr * 1.1, my + (r() - 0.5) * mr * 1.1, mr * (0.12 + r() * 0.22), 0, 7);
        x.fill();
      }
      for (let i = 0; i < 5; i++) {
        const cy = horizon * (0.32 + r() * 0.5);
        const cx = r() * W;
        const cw = W * (0.35 + r() * 0.5);
        for (let j = 0; j < 26; j++) {
          x.fillStyle = `rgba(${cy > horizon * 0.6 ? "255,190,170" : "190,140,180"},${0.025 + r() * 0.03})`;
          x.beginPath();
          x.ellipse(cx + (r() - 0.5) * cw, cy + (r() - 0.5) * 8, cw * (0.1 + r() * 0.2), 2 + r() * 4, 0, 0, 7);
          x.fill();
        }
      }
      const hill = (y0: number, amp: number, col: string, f: number) => {
        x.fillStyle = col;
        x.beginPath();
        x.moveTo(0, H);
        for (let i = 0; i <= 40; i++) {
          const px = (i / 40) * W;
          x.lineTo(px, y0 - amp * (Math.sin(px * f + y0) * 0.6 + Math.sin(px * f * 2.7 + 1) * 0.4));
        }
        x.lineTo(W, H);
        x.fill();
      };
      hill(horizon - 6, 10, "#8a5a72", 0.011);
      const mist = x.createLinearGradient(0, horizon - 30, 0, horizon + 10);
      mist.addColorStop(0, "rgba(240,170,150,0)");
      mist.addColorStop(1, "rgba(240,170,150,.35)");
      x.fillStyle = mist;
      x.fillRect(0, horizon - 30, W, 40);
      hill(horizon + 2, 6, "#4a3550", 0.017);
      const gr = x.createLinearGradient(0, horizon, 0, H);
      gr.addColorStop(0, "#3a2a44");
      gr.addColorStop(0.4, "#271c31");
      gr.addColorStop(1, "#150f1c");
      x.fillStyle = gr;
      x.beginPath();
      x.moveTo(0, H);
      for (let i = 0; i <= 40; i++) {
        const px = (i / 40) * W;
        x.lineTo(px, horizon + 8 + Math.sin(px * 0.02) * 3);
      }
      x.lineTo(W, H);
      x.fill();
      for (let i = 0; i < 900; i++) {
        const gy = horizon + 10 + Math.pow(r(), 0.8) * (H - horizon);
        const gx = r() * W;
        x.strokeStyle = `rgba(${r() < 0.5 ? "120,90,120" : "20,12,24"},${0.12 + r() * 0.18})`;
        x.lineWidth = 0.8;
        x.beginPath();
        x.moveTo(gx, gy);
        x.lineTo(gx + (r() - 0.5) * 3, gy - 2 - r() * 4 * (gy / H));
        x.stroke();
      }
      const pool = x.createRadialGradient(OX, baseY + 6, 0, OX, baseY + 6, W * 0.42);
      pool.addColorStop(0, "rgba(255,170,190,.16)");
      pool.addColorStop(1, "rgba(255,170,190,0)");
      x.fillStyle = pool;
      x.fillRect(0, horizon, W, H - horizon);
      const sh = x.createRadialGradient(OX, baseY + 4, 0, OX, baseY + 4, 60 * S);
      sh.addColorStop(0, "rgba(8,4,12,.55)");
      sh.addColorStop(1, "rgba(8,4,12,0)");
      x.save();
      x.translate(OX, baseY + 4);
      x.scale(1, 0.18);
      x.translate(-OX, -baseY - 4);
      x.fillStyle = sh;
      x.fillRect(OX - 70 * S, baseY - 70 * S, 140 * S, 140 * S);
      x.restore();

      grain = mk(W * DPR, H * DPR);
      const q = grain.getContext("2d")!;
      q.scale(DPR, DPR);
      const n = mk(160, 160);
      const nq = n.getContext("2d")!;
      const id = nq.createImageData(160, 160);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = r() * 255;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
        id.data[i + 3] = 14;
      }
      nq.putImageData(id, 0, 0);
      q.fillStyle = q.createPattern(n, "repeat")!;
      q.fillRect(0, 0, W, H);
      const vg = q.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.78);
      vg.addColorStop(0, "rgba(10,6,20,0)");
      vg.addColorStop(1, "rgba(10,6,20,.52)");
      q.fillStyle = vg;
      q.fillRect(0, 0, W, H);
    }

    function claim(p: Petal, nowSec: number) {
      let best = -1;
      let bd = 1e9;
      for (let i = nextT, n = 0; i < targets.length && n < 36; i++) {
        if (targets[i].p) continue;
        n++;
        const d = Math.abs(targets[i].x - p.x);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      if (best < 0 || !nameBox) return false;
      const tg = targets[best];
      tg.p = p;
      p.t = tg;
      p.spr = Math.random() < 0.6 ? 2 : 0;
      p.size = Math.max(p.size * 1.14, nameBox.gs * 1.08);
      while (nextT < targets.length && targets[nextT].p) nextT++;
      p.gs = nowSec + 0.05 + Math.random() * 0.35;
      p.dur = 0.65 + Math.random() * 0.5;
      p.sx = p.x;
      p.sy = p.y;
      p.srot = p.rot;
      return true;
    }

    function sampleName() {
      const top = baseY + 12;
      const bottom = H - 36;
      const areaH = Math.max(48, Math.min(bottom - top, W * 0.2));
      const sy = 0.84;
      const c = mk(W, Math.ceil(areaH * 1.6));
      const x = c.getContext("2d")!;
      const nameCenterX = W >= 960 ? OX : W * 0.5;
      const maxTextW = W >= 960 ? W * 0.46 : W * 0.82;
      let f = areaH / sy / 1.02;
      x.font = `800 ${f}px "Baloo 2", sans-serif`;
      const tw = x.measureText(CONFIG.name || "Florea").width;
      if (tw > maxTextW) f *= maxTextW / tw;
      x.font = `800 ${f}px "Baloo 2", sans-serif`;
      const m = x.measureText(CONFIG.name || "Florea");
      const asc = m.actualBoundingBoxAscent || f * 0.75;
      const desc = m.actualBoundingBoxDescent || f * 0.25;
      x.textAlign = "center";
      x.textBaseline = "alphabetic";
      x.fillStyle = "#fff";
      x.fillText(CONFIG.name || "Florea", nameCenterX, asc + 2);
      const hh = Math.max(12, asc + desc + 4);
      const data = x.getImageData(0, 0, W, Math.ceil(hh)).data;
      const cy = top + areaH / 2;
      let A = 0;
      for (let i = 3; i < data.length; i += 16) if (data[i] > 128) A += 4;
      const gs = Math.max(2.4, Math.sqrt(Math.max(100, A) / CONFIG.petalsInName));
      const pts: TargetPoint[] = [];
      const r = seeded(5);
      for (let yy = gs / 2; yy < hh; yy += gs) {
        for (let xx = gs / 2; xx < W; xx += gs) {
          const jx = xx + (r() - 0.5) * gs * 0.6;
          const jy = yy + (r() - 0.5) * gs * 0.6;
          if (data[((jy | 0) * W + (jx | 0)) * 4 + 3] > 128) {
            pts.push({
              x: jx,
              y: cy + (jy - hh / 2) * sy,
              rot: (r() - 0.5) * 2.4,
              k: jx + (r() - 0.5) * 40,
              p: null,
            });
          }
        }
      }
      pts.sort((a, b) => a.k - b.k);
      const old = targets.filter((t) => t.p).map((t) => t.p!);
      targets = pts;
      nextT = 0;
      nameBox = { cx: nameCenterX, cy, h: hh * sy, gs };
      // Pass curSec (in SECONDS, not milliseconds!) so petals immediately glide into the letters!
      for (const p of old) {
        p.t = null;
        claim(p, curSec);
      }
      for (const p of settled) {
        if (!p.t && nextT < targets.length) claim(p, curSec);
      }
    }

    function layout() {
      const rect = cv!.getBoundingClientRect();
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(320, rect.width || window.innerWidth);
      H = Math.max(600, rect.height || window.innerHeight);
      cv!.width = W * DPR;
      cv!.height = H * DPR;
      horizon = H * 0.725;
      baseY = H * 0.75;
      let x0 = 1e9;
      let x1 = -1e9;
      let y0 = 1e9;
      for (const b of branches) {
        for (const p of b.pts) {
          x0 = Math.min(x0, p[0]);
          x1 = Math.max(x1, p[0]);
          y0 = Math.min(y0, p[1]);
        }
      }
      x0 -= 18;
      x1 += 18;
      y0 -= 18;

      const desktopRight = W >= 960;
      const maxTreeWidth = desktopRight ? W * 0.56 : W * 0.96;
      const maxTreeHeight = baseY - H * (desktopRight ? 0.08 : 0.34);
      S = Math.min(maxTreeWidth / (x1 - x0), maxTreeHeight / -y0);
      OX = (desktopRight ? W * 0.71 : W * 0.54) - ((x0 + x1) / 2) * S;
      OY = baseY;

      for (const b of branches) b.s = b.pts.map((p) => [OX + p[0] * S, OY + p[1] * S]);
      for (const f of blossoms) {
        f.x = OX + f.ux * S;
        f.y = OY + f.uy * S;
      }
      makeSprites();
      paintBackdrop();
      treeCache = null;
      wash = mk(W * DPR, H * DPR);
      const wx = wash.getContext("2d")!;
      wx.scale(DPR, DPR);
      for (let i = 0; i < blossoms.length; i += 3) {
        const f = blossoms[i];
        const rr = 16 * S;
        const gr = wx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rr);
        gr.addColorStop(0, hsl(SAKURA_HUE, 60, 78, 0.05));
        gr.addColorStop(1, hsl(SAKURA_HUE, 60, 78, 0));
        wx.fillStyle = gr;
        wx.fillRect(f.x - rr, f.y - rr, rr * 2, rr * 2);
      }
      sampleName();
    }

    function shed(f: Blossom, vx: number, vy: number, currentTime: number, byHuman = false) {
      if (f.hp <= 0) return;
      f.hp--;
      const delay = byHuman ? 1.5 + Math.random() * 1.4 : 2.5 + Math.random() * 1.8;
      f.regrowAt = currentTime + delay;

      flying.push({
        x: f.x + (Math.random() - 0.5) * f.size * S,
        y: f.y + (Math.random() - 0.5) * f.size * S,
        vx: vx + (Math.random() - 0.5) * 30,
        vy: vy - Math.random() * 20,
        rot: Math.random() * 6.28,
        spin: (Math.random() - 0.5) * 5,
        fl: Math.random() * 6.28,
        fs: 3 + Math.random() * 5,
        fw: 1.5 + Math.random() * 2,
        fa: 14 + Math.random() * 22,
        fall: (0.34 + Math.random() * 0.14) * H,
        size: (3.6 + Math.random() * 1.8) * Math.max(0.75, S),
        spr: (Math.random() * 4) | 0,
        land: horizon + 8 + Math.random() * (H - horizon - 28),
      });
    }

    function drawBranch(x: CanvasRenderingContext2D, b: Branch, gfrac: number) {
      const s = b.s!;
      const L = b.cum[b.cum.length - 1] * gfrac;
      const pts: [number, number][] = [s[0]];
      const ws: number[] = [b.w0 * S];
      for (let i = 1; i < s.length; i++) {
        if (b.cum[i] <= L) {
          pts.push(s[i]);
          ws.push(lerp(b.w0, b.w1, b.cum[i] / b.cum[b.cum.length - 1]) * S);
          continue;
        }
        const u = (L - b.cum[i - 1]) / (b.cum[i] - b.cum[i - 1] || 1);
        pts.push([lerp(s[i - 1][0], s[i][0], u), lerp(s[i - 1][1], s[i][1], u)]);
        ws.push(lerp(b.w0, b.w1, gfrac) * S * 0.8);
        break;
      }
      if (pts.length < 2) return;
      const tipCap = gfrac < 1;
      if (b.depth === 0) {
        for (let i = 0; i < ws.length; i++) {
          ws[i] *= 1 + 0.9 * Math.pow(Math.max(0, 1 - b.cum[i] / 30), 2);
        }
      }
      const left: [number, number][] = [];
      const right: [number, number][] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)];
        const c = pts[Math.min(pts.length - 1, i + 1)];
        let nx = -(c[1] - a[1]);
        let ny = c[0] - a[0];
        const l = Math.hypot(nx, ny) || 1;
        nx /= l;
        ny /= l;
        left.push([pts[i][0] + (nx * ws[i]) / 2, pts[i][1] + (ny * ws[i]) / 2]);
        right.push([pts[i][0] - (nx * ws[i]) / 2, pts[i][1] - (ny * ws[i]) / 2]);
      }
      const shade = Math.min(1, b.depth / 7);
      x.fillStyle = `rgb(${(40 + shade * 34) | 0},${(27 + shade * 16) | 0},${(36 + shade * 18) | 0})`;
      x.beginPath();
      x.moveTo(left[0][0], left[0][1]);
      for (const p of left) x.lineTo(p[0], p[1]);
      for (let i = right.length - 1; i >= 0; i--) x.lineTo(right[i][0], right[i][1]);
      x.closePath();
      x.fill();
      if (tipCap) {
        const e = pts[pts.length - 1];
        x.beginPath();
        x.arc(e[0], e[1], ws[ws.length - 1] / 2, 0, 7);
        x.fill();
      }
      if (b.depth) {
        x.beginPath();
        x.arc(pts[0][0], pts[0][1], ws[0] / 2, 0, 7);
        x.fill();
      }
      if (ws[0] > 1.6) {
        x.lineCap = "round";
        x.strokeStyle = "rgba(196,180,214,.32)";
        x.lineWidth = Math.max(0.6, ws[0] * 0.16);
        x.beginPath();
        right.forEach((p, i) => {
          const q = [lerp(p[0], pts[i][0], 0.25), lerp(p[1], pts[i][1], 0.25)];
          i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]);
        });
        x.stroke();
        x.strokeStyle = "rgba(236,150,128,.18)";
        x.beginPath();
        left.forEach((p, i) => {
          const q = [lerp(p[0], pts[i][0], 0.25), lerp(p[1], pts[i][1], 0.25)];
          i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]);
        });
        x.stroke();
      }
    }

    function drawTree(t: number) {
      if (treeCache) {
        g!.drawImage(treeCache, 0, 0, W, H);
        return;
      }
      const done = t > CONFIG.grow + 0.4;
      let x: CanvasRenderingContext2D = g!;
      if (done) {
        treeCache = mk(W * DPR, H * DPR);
        x = treeCache.getContext("2d")!;
        x.scale(DPR, DPR);
      }
      for (const b of branches) {
        const k = clamp((t - b.t0) / b.dur);
        if (k > 0) drawBranch(x, b, done ? 1 : easeOut(k));
      }
      if (done && treeCache) g!.drawImage(treeCache, 0, 0, W, H);
    }

    function drawBlossoms(t: number, back: boolean) {
      for (const f of blossoms) {
        if (f.back !== back || f.hp <= 0) continue;
        const a = t - f.pop + 0.35;
        if (a < 0) continue;
        let sc: number;
        let spr: number;
        if (a < 0.35) {
          sc = 0.25 + a * 0.6;
          spr = 5;
        } else {
          sc = backOut(clamp((a - 0.35) / 0.45));
          spr = f.back ? 4 + (f.v & 1) : f.v;
        }
        const z = f.size * S * sc * (0.62 + (0.38 * f.hp) / 3) * 2;
        const c = Math.cos(f.rot + a * 0.3 * (1 - clamp(a)));
        const s = Math.sin(f.rot);
        g!.setTransform((c * DPR * z) / 64, (s * DPR * z) / 64, (-s * DPR * z) / 64, (c * DPR * z) / 64, f.x * DPR, f.y * DPR);
        g!.globalAlpha = f.al;
        g!.drawImage(blossomSpr[spr], -32, -32);
      }
      g!.globalAlpha = 1;
      g!.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function drawPetal(p: Petal, sy: number, alpha: number) {
      const z = ((p.size * 2) / 32) * DPR;
      const c = Math.cos(p.rot);
      const s = Math.sin(p.rot);
      g!.globalAlpha = alpha;
      g!.setTransform(c * z, s * z * sy, -s * z, c * z * sy, p.x * DPR, p.y * DPR);
      g!.drawImage(petalSpr[p.spr], -16, -16);
    }

    buildTreeAndBlossoms();
    layout();
    document.fonts
      ?.load('800 48px "Baloo 2"')
      .then(() => sampleName())
      .catch(() => {});

    const onDown = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      ptr.down = true;
      ptr.x = ptr.px = e.clientX - rect.left;
      ptr.y = ptr.py = e.clientY - rect.top;
      ptr.moved = false;
    };
    const onMove = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      if (!ptr.seen) {
        ptr.px = cx;
        ptr.py = cy;
      }
      ptr.seen = true;
      ptr.x = cx;
      ptr.y = cy;
      ptr.moved = true;
    };
    const onUp = () => {
      ptr.down = false;
    };

    cv.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", layout);

    function frame(now: number) {
      rafId = requestAnimationFrame(frame);
      if (t0 === null) {
        t0 = now;
        last = now;
      }

      const t = (now - t0) / 1000;
      curSec = t;
      const dt = Math.min(0.05, (now - last) / 1000) || 1 / 60;
      last = now;

      if (stateRef.current.name !== CONFIG.name) {
        CONFIG.name = stateRef.current.name;
        sampleName();
        // Shed an extra burst so any new letters fill up immediately
        for (let i = 0; i < 65; i++) {
          const f = blossoms[(Math.random() * blossoms.length) | 0];
          if (f && t > f.pop) shed(f, 0, 20, t, false);
        }
      }

      // Re-bud & re-bloom individual flowers that were shed!
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

      const active = ptr.down || (ptr.seen && ptr.moved);
      const vx = active ? (ptr.x - ptr.px) / dt : 0;
      const vy = active ? (ptr.y - ptr.py) / dt : 0;
      ptr.vx = lerp(ptr.vx, vx, 0.5);
      ptr.vy = lerp(ptr.vy, vy, 0.5);
      const speed = Math.hypot(ptr.vx, ptr.vy);
      const str = ptr.down ? 1 : 0.6;
      wind = clamp(wind * Math.exp(-dt * 1.6) + ptr.vx * 0.03 * str * dt * 3, -40, 40);
      const breeze = 9 * Math.sin(t * 0.37) + 5 * Math.sin(t * 1.1 + 2);

      if (active && speed > 45) {
        ptr.trail.push({ x: ptr.x, y: ptr.y, t });
        const rad = 82 * Math.max(0.8, S);
        const p = clamp(speed / 780) * 0.16 * str;
        const ax = ptr.px;
        const ay = ptr.py;
        const bx = ptr.x - ax;
        const by = ptr.y - ay;
        const bl = bx * bx + by * by || 1;
        for (const f of blossoms) {
          if (f.hp <= 0 || t < f.pop + 0.15) continue;
          const u = clamp(((f.x - ax) * bx + (f.y - ay) * by) / bl);
          const dx = f.x - ax - bx * u;
          const dy = f.y - ay - by * u;
          const d2 = dx * dx + dy * dy;
          if (d2 < rad * rad && Math.random() < p * (1 - Math.sqrt(d2) / rad)) {
            shed(f, ptr.vx * 0.2, ptr.vy * 0.15, t, true);
          }
        }
      }
      ptr.px = ptr.x;
      ptr.py = ptr.y;
      ptr.moved = false;
      while (ptr.trail.length && t - ptr.trail[0].t > 0.45) ptr.trail.shift();

      // Automatic petal shedding so the name under the tree always spells out clearly!
      if (t > CONFIG.grow + 0.6) {
        const rate = nextT < targets.length ? CONFIG.shed : 12;
        let n = rate * dt;
        while (n > 0) {
          if (Math.random() < n) {
            const f = blossoms[(Math.random() * blossoms.length) | 0];
            if (f && t > f.pop + 0.25) shed(f, 0, 15, t, false);
          }
          n -= 1;
        }
      }

      // Paint scene
      g!.setTransform(DPR, 0, 0, DPR, 0, 0);
      g!.globalAlpha = 1;
      if (bg) g!.drawImage(bg, 0, 0, W, H);
      let alive = 0;
      for (let i = 0; i < blossoms.length; i += 10) if (blossoms[i].hp > 0) alive++;
      g!.globalAlpha = clamp((t - CONFIG.grow * 0.7) / 2) * (0.35 + (0.65 * alive) / (blossoms.length / 10));
      if (wash) g!.drawImage(wash, 0, 0, W, H);
      g!.globalAlpha = 1;
      drawBlossoms(t, true);
      drawTree(t);
      drawBlossoms(t, false);

      const prog = targets.length ? filled / targets.length : 0;
      if (nameBox && prog > 0.1) {
        const gl = g!.createRadialGradient(nameBox.cx, nameBox.cy, 0, nameBox.cx, nameBox.cy, W * 0.34);
        gl.addColorStop(0, hsl(SAKURA_HUE, 80, 75, 0.28 * clamp((prog - 0.1) / 0.6)));
        gl.addColorStop(1, hsl(SAKURA_HUE, 80, 75, 0));
        g!.save();
        g!.translate(0, nameBox.cy);
        g!.scale(1, 0.32);
        g!.translate(0, -nameBox.cy);
        g!.fillStyle = gl;
        g!.fillRect(0, nameBox.cy - W, W, W * 2);
        g!.restore();
      }

      if (settled.length && nextT < targets.length) {
        quota += dt * CONFIG.writeSpeed;
        for (const p of settled) {
          if (quota < 1 || nextT >= targets.length) break;
          if (!p.t && claim(p, t)) quota--;
        }
      } else {
        quota = 0;
      }

      filled = 0;
      for (const p of settled) {
        if (p.t) {
          const u = clamp((t - (p.gs || 0)) / (p.dur || 1));
          const e = easeIO(u);
          p.x = lerp(p.sx || p.x, p.t.x, e);
          p.y = lerp(p.sy || p.y, p.t.y, e) - Math.sin(Math.PI * u) * 10 * S;
          p.rot = lerp(p.srot || p.rot, p.t.rot, e);
          if (u >= 1) filled++;
          g!.setTransform(DPR, 0, 0, DPR, 0, 0);
          g!.globalAlpha = 0.35 * e;
          g!.fillStyle = "#0c0710";
          g!.beginPath();
          g!.ellipse(p.x + 0.6, p.t.y + 1.2, p.size * 0.55, p.size * 0.22, 0, 0, 7);
          g!.fill();
          drawPetal(p, lerp(0.72, 0.78, e), 1);
        } else {
          p.age = (p.age || 0) + dt;
          if (nextT >= targets.length) p.gone = (p.gone || 0) + dt;
          drawPetal(p, 0.7, 0.5 * clamp(1 - (p.gone || 0) / 3.5) * clamp(1.4 - (p.age || 0) / 14));
        }
      }
      for (let i = settled.length - 1; i >= 0; i--) {
        if (!settled[i].t && ((settled[i].age || 0) > 19.6 || (settled[i].gone || 0) > 3.5)) {
          settled.splice(i, 1);
        }
      }

      for (let i = flying.length - 1; i >= 0; i--) {
        const p = flying[i];
        const wx = wind + breeze * 0.6;
        if (active && speed > 45) {
          const dx = p.x - ptr.x;
          const dy = p.y - ptr.y;
          const d = Math.hypot(dx, dy);
          const rr = 110 * Math.max(0.8, S);
          if (d < rr) {
            const k = (1 - d / rr) * str * dt * 2;
            p.vx += ptr.vx * k;
            p.vy += ptr.vy * k * 0.6;
          }
        }
        p.vx += (wx - p.vx) * (1 - Math.exp(-dt * 1.1));
        p.vy += (p.fall - p.vy) * (1 - Math.exp(-dt * 1.6));
        p.fl += p.fs * dt;
        p.x += (p.vx + Math.sin(p.fl * 0.5 * p.fw) * p.fa) * dt;
        p.y += p.vy * dt * (0.75 + 0.25 * Math.abs(Math.cos(p.fl)));
        p.rot += p.spin * dt;
        if (p.y >= p.land && p.vy > 0) {
          flying.splice(i, 1);
          p.rot = Math.random() * 6.28;
          p.age = 0;
          p.t = null;
          settled.push(p);
          continue;
        }
        if (p.x < -60 || p.x > W + 60 || p.y > H + 30) {
          flying.splice(i, 1);
          continue;
        }
        drawPetal(p, Math.cos(p.fl), 0.95);
      }
      if (flying.length > 1800) flying.splice(0, flying.length - 1800);
      g!.globalAlpha = 1;
      g!.setTransform(DPR, 0, 0, DPR, 0, 0);

      // Subtitle under the petal-spelled name on the right
      if (nameBox && prog > 0.25) {
        g!.save();
        let fs = 18;
        g!.font = `600 ${fs}px "Baloo 2", sans-serif`;
        const maxW = Math.min(W - 24, W >= 960 ? W * 0.5 : W * 0.94);
        const cw = g!.measureText(captionRef.current).width;
        if (cw > maxW) { fs = Math.max(10, (fs * maxW) / cw); g!.font = `600 ${fs}px "Baloo 2", sans-serif`; } // chữ dài thì thu nhỏ cho vừa khung
        g!.fillStyle = `rgba(246, 223, 228, ${clamp((prog - 0.25) / 0.55) * 0.9})`;
        g!.textAlign = "center";
        g!.fillText(captionRef.current, nameBox.cx, H - 16);
        g!.restore();
      }

      if (ptr.trail.length > 2) {
        g!.lineCap = "round";
        for (const off of [-14, 0, 13]) {
          g!.beginPath();
          ptr.trail.forEach((q, i) => {
            const y = q.y + off * S + Math.sin(i * 0.9 + off) * 2;
            i ? g!.lineTo(q.x, y) : g!.moveTo(q.x, y);
          });
          g!.strokeStyle = `rgba(255,236,240,${off ? 0.1 : 0.18})`;
          g!.lineWidth = off ? 1 : 1.6;
          g!.stroke();
        }
      }
      if (grain) g!.drawImage(grain, 0, 0, W, H);

    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      cv.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", layout);
    };
  }, []);

  const handleNameChange = (val: string) => {
    setCustomName(val);
    stateRef.current.name = val.trim() || "Florea";
  };

  return (
    <section id="top" className="relative w-full bg-[#1a1730] select-none">
      {/* Khung cây đào: cố định theo chiều cao màn hình trên máy tính (luôn thấy cả cây lẫn chữ cánh hoa ghép);
          trên điện thoại là một khối riêng phía trên, nội dung nằm ngay bên dưới nên không che chữ */}
      <div className="relative z-0 h-[58svh] min-h-[400px] w-full lg:sticky lg:top-0 lg:h-[100svh] lg:min-h-[560px]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#231a31] lg:hidden" />
      </div>
      <div className="pointer-events-none relative z-20 flex w-full flex-col justify-center bg-[#231a31] px-4 py-8 sm:px-8 lg:-mt-[100svh] lg:min-h-[100svh] lg:bg-transparent lg:py-24 lg:pt-28 lg:pl-12 xl:pl-16">
        <div className={cn("w-full text-left", contentWidth)}>
          {children}
          {showNameInput && (
            <div className="pointer-events-auto mt-5 inline-flex flex-wrap items-center gap-2.5 rounded-2xl border border-white/25 bg-[#1e162b]/70 p-2 pr-3 shadow-lg backdrop-blur-xl">
              <span className="pl-2 text-[11.5px] font-medium text-[#f3ced9]">🌸 Cánh hoa xếp chữ:</span>
              <input
                type="text"
                maxLength={14}
                value={customName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nhập tên người nhận…"
                aria-label="Tên để cánh hoa ghép thành chữ"
                className="w-[170px] rounded-xl border border-white/20 bg-white/12 px-3 py-1.5 font-serif text-[18px] text-white outline-none placeholder:text-white/40 focus:border-[#f7a8be]"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
