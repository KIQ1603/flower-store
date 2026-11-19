import { useEffect, useRef } from "react";

type Hero3DCanvasProps = {
  accentColor?: string;
  className?: string;
};

type FloatingParticle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  size: number;
  type: "petal" | "orb";
  color: string;
};

export function Hero3DCanvas({ accentColor = "#e06d88", className }: Hero3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || 760;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / Math.max(1, width) - 0.5) * 2;
      mouse.ty = ((e.clientY - rect.top) / Math.max(1, height) - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    const palette = ["#f9c5d1", "#f497ad", "#fce1e8", "#d4e4d0", "#f7d9b0", accentColor];
    const particles: FloatingParticle[] = Array.from({ length: 28 }, (_, i) => ({
      x: (Math.random() - 0.5) * 1300,
      y: (Math.random() - 0.5) * 800,
      z: Math.random() * 450 - 180,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 0.28 + Math.random() * 0.45,
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      rz: Math.random() * Math.PI * 2,
      vrx: (Math.random() - 0.5) * 0.02,
      vry: (Math.random() - 0.5) * 0.02,
      vrz: (Math.random() - 0.5) * 0.018,
      size: i % 3 === 0 ? 4 + Math.random() * 5 : 8 + Math.random() * 9,
      type: i % 3 === 0 ? "orb" : "petal",
      color: palette[i % palette.length],
    }));

    let t = 0;

    const render = () => {
      t += 0.012;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      for (const pt of particles) {
        pt.x += pt.vx + mouse.x * 0.25;
        pt.y += pt.vy;
        pt.rx += pt.vrx;
        pt.ry += pt.vry;
        pt.rz += pt.vrz;

        if (pt.y > height * 0.65) {
          pt.y = -height * 0.65;
          pt.x = (Math.random() - 0.5) * width * 1.1;
        }
        if (pt.x > width * 0.65) pt.x = -width * 0.65;
        if (pt.x < -width * 0.65) pt.x = width * 0.65;

        const fov = 650;
        const sc = fov / (fov - pt.z);
        const px = width * 0.5 + pt.x * sc;
        const py = height * 0.5 + pt.y * sc;

        ctx.save();
        ctx.translate(px, py);

        if (pt.type === "orb") {
          const r = pt.size * sc * (1 + Math.sin(t * 2 + pt.x) * 0.2);
          const g = ctx.createRadialGradient(0, 0, 0.5, 0, 0, r * 2.2);
          g.addColorStop(0, "rgba(255, 246, 228, 0.8)");
          g.addColorStop(0.5, "rgba(244, 172, 188, 0.3)");
          g.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.rotate(pt.rz);
          const sx = Math.cos(pt.rx) * sc;
          const sy = Math.sin(pt.ry) * 0.7 * sc + 0.35;
          ctx.scale(sx, sy);

          const s = pt.size;
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = 0.72;
          ctx.beginPath();
          ctx.moveTo(0, s);
          ctx.bezierCurveTo(-s * 0.9, s * 0.2, -s * 0.8, -s * 0.9, 0, -s);
          ctx.bezierCurveTo(s * 0.8, -s * 0.9, s * 0.9, s * 0.2, 0, s);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [accentColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
    />
  );
}
