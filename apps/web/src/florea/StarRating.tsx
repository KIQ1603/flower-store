import { useState } from "react";
import { cn } from "../utils/cn";
import { StarFilled } from "@ant-design/icons";

export const STAR_TEXT = ["", "Rất tệ", "Chưa hài lòng", "Bình thường", "Hài lòng", "Tuyệt vời"];

/** Chọn sao: nhóm radio dễ bấm trên điện thoại (ô 44px), dùng phím ← → để đổi, mô tả bằng chữ cho từng mức */
export function StarInput({ label, value, onChange, error }: { label: string; value: number; onChange: (v: number) => void; error?: string }) {
  const [hover, setHover] = useState(0);
  const show = hover || value;
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={!!error}>
      <div className="flex flex-wrap items-center gap-x-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} sao – ${STAR_TEXT[n]}`} tabIndex={value === n || (!value && n === 1) ? 0 : -1}
            onClick={() => onChange(n)} onMouseEnter={() => setHover(n)}
            onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1)); } if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, (value || 2) - 1)); } }}
            className="grid h-11 w-11 place-items-center rounded-full text-[34px] leading-none transition hover:scale-110 focus-visible:outline-2">
            <span className={cn(n <= show ? "text-[#e9a53b]" : "text-line")} aria-hidden><StarFilled /></span>
          </button>
        ))}
        <span className="mt-1 w-full text-[15px] font-bold text-ink-soft sm:mt-0 sm:ml-2 sm:w-auto sm:min-w-[7em]" aria-live="polite">{show ? STAR_TEXT[show] : "Chạm để chấm sao"}</span>
      </div>
      {error && <p role="alert" className="mt-1 text-[13px] font-semibold text-rose-deep">{error}</p>}
    </div>
  );
}
