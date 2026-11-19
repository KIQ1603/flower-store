import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Direction of entrance */
  from?: "up" | "left" | "right" | "scale";
  /** Amount of the element that must be visible before revealing */
  threshold?: number;
};

export function Reveal({ children, className, delay = 0, from = "up", threshold = 0.12 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        "reveal",
        from === "left" && "reveal-left",
        from === "right" && "reveal-right",
        from === "scale" && "reveal-scale",
        visible && "is-visible",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
