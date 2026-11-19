import type { CSSProperties } from "react";

const PETALS = Array.from({ length: 16 }, (_, i) => {
  const rose = i % 3 !== 2;
  return {
    left: `${(i * 37 + 6) % 100}%`,
    size: 6 + (i % 4) * 2.2,
    duration: 30 + (i % 6) * 6,
    delay: -(i * 4.3),
    drift: `${(i % 2 === 0 ? 1 : -1) * (28 + (i % 5) * 22)}px`,
    rotate: (i * 47) % 360,
    color: rose
      ? i % 2 === 0
        ? "linear-gradient(140deg, #efd3ca 0%, #d9a49c 100%)"
        : "linear-gradient(140deg, #faf0ec 0%, #e3b7ae 100%)"
      : "linear-gradient(140deg, #e6eddf 0%, #b8c7ae 100%)",
    opacity: rose ? 0.62 : 0.45,
  };
});

export function Petals() {
  return (
    <div className="petal-layer" aria-hidden="true">
      {PETALS.map((petal, i) => (
        <span
          key={i}
          className="petal"
          style={
            {
              left: petal.left,
              width: `${petal.size}px`,
              height: `${petal.size * 1.45}px`,
              background: petal.color,
              opacity: 0,
              animationDuration: `${petal.duration}s`,
              animationDelay: `${petal.delay}s`,
              "--drift": petal.drift,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
