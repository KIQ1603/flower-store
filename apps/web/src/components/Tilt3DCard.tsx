import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { cn } from "../utils/cn";

type Tilt3DCardProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  maxTilt?: number;
  scale?: number;
  glare?: boolean;
};

export function Tilt3DCard({
  children,
  className,
  innerClassName,
  maxTilt = 11,
  scale = 1.02,
  glare = true,
}: Tilt3DCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({
    transform: "perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    "--gx": "50%",
    "--gy": "50%",
    "--g-opacity": "0",
  } as CSSProperties);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * maxTilt * 2;
    const rx = (0.5 - py) * maxTilt * 2;

    setStyle({
      transform: `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transition: "transform 120ms cubic-bezier(0.22, 1, 0.36, 1)",
      "--gx": `${(px * 100).toFixed(1)}%`,
      "--gy": `${(py * 100).toFixed(1)}%`,
      "--g-opacity": "1",
    } as CSSProperties);
  };

  const onLeave = () => {
    setStyle({
      transform: "perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)",
      "--gx": "50%",
      "--gy": "50%",
      "--g-opacity": "0",
    } as CSSProperties);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("tilt-3d-root relative", className)}
    >
      <div style={style} className={cn("tilt-3d-body relative preserve-3d", innerClassName)}>
        {children}
        {glare && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[inherit] transition-opacity duration-500"
            style={{
              opacity: "var(--g-opacity, 0)",
              background:
                "radial-gradient(360px circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.42), rgba(255,244,234,0.12) 45%, transparent 75%)",
              mixBlendMode: "overlay",
            }}
          />
        )}
      </div>
    </div>
  );
}
