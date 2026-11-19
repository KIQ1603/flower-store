import { useEffect, useId, useRef, useState } from "react";
import { CheckOutlined, DownOutlined } from "@ant-design/icons";
import { cn } from "../utils/cn";

export type Opt = { value: string | number; label: string };

/**
 * Ô chọn dùng chung cho cả web khách: cùng một kiểu ở mọi trang. Danh sách luôn xổ xuống phía dưới,
 * rộng đúng bằng ô chọn, chiều cao tối đa vừa phải và cuộn khi nhiều mục (không kéo dài hết màn hình).
 */
export function FSelect({ id, value, onChange, options, placeholder = "Chọn…", disabled, invalid, className, ariaLabel, allLabel, dark }: {
  id?: string; value: string | number | ""; onChange: (v: string | number) => void; options: Opt[]; placeholder?: string; disabled?: boolean; invalid?: boolean;
  className?: string; dark?: boolean; ariaLabel?: string; /** Thêm mục đầu danh sách (giá trị "") để bỏ chọn, VD "Tất cả" */ allLabel?: string;
}) {
  const auto = useId(); const lid = `${id ?? auto}-list`;
  const [open, setOpen] = useState(false); const [cur, setCur] = useState(0); const [maxH, setMaxH] = useState(256);
  const root = useRef<HTMLDivElement>(null); const btn = useRef<HTMLButtonElement>(null); const list = useRef<HTMLUListElement>(null);
  const all: Opt[] = allLabel ? [{ value: "", label: allLabel }, ...options] : options;
  const sel = all.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);
  useEffect(() => { if (open) list.current?.querySelector<HTMLElement>(`[data-i="${cur}"]`)?.scrollIntoView({ block: "nearest" }); }, [cur, open]);

  const show = () => {
    if (disabled) return;
    // luôn xổ xuống dưới ô; nếu sát đáy màn hình thì cuộn trang thêm một chút để đủ chỗ, còn thiếu thì thu ngắn danh sách và cuộn trong danh sách
    let r = btn.current?.getBoundingClientRect();
    if (r && window.innerHeight - r.bottom - 12 < 260) { window.scrollBy({ top: 260 - (window.innerHeight - r.bottom - 12), behavior: "instant" as ScrollBehavior }); r = btn.current?.getBoundingClientRect(); }
    if (r) setMaxH(Math.max(160, Math.min(256, window.innerHeight - r.bottom - 12)));
    setCur(Math.max(0, all.findIndex((o) => String(o.value) === String(value)))); setOpen(true);
  };
  const pick = (o: Opt) => { onChange(o.value); setOpen(false); btn.current?.focus(); };
  const key = (e: React.KeyboardEvent) => {
    if (!open) { if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); show(); } return; }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setCur((c) => Math.min(all.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCur((c) => Math.max(0, c - 1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (all[cur]) pick(all[cur]); }
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      <button ref={btn} id={id} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={lid} aria-label={ariaLabel} aria-invalid={invalid || undefined} disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={key}
        className={cn("flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-[15px] transition outline-none focus-visible:border-rose focus-visible:ring-4 focus-visible:ring-rose-soft disabled:cursor-not-allowed disabled:opacity-55", dark ? "border-white/25 bg-white/10 text-white hover:border-[#f7a8be]" : "bg-white text-ink", invalid ? "border-rose-deep" : dark ? "" : "border-line hover:border-rose", open && "border-rose")}>
        <span className={cn("truncate", !sel && (dark ? "text-white/70" : "text-ink-faint"))}>{sel ? sel.label : placeholder}</span>
        <DownOutlined aria-hidden className={cn("shrink-0 text-[12px] text-ink-faint transition", open && "rotate-180")} />
      </button>
      {open && (
        <ul ref={list} id={lid} role="listbox" aria-label={ariaLabel} style={{ maxHeight: maxH }} className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-y-auto rounded-xl border border-line bg-white py-1.5 shadow-[0_18px_40px_-18px_rgba(62,45,38,0.35)]">
          {all.length === 0 && <li className="px-4 py-2.5 text-[14px] text-ink-faint">Không có lựa chọn</li>}
          {all.map((o, i) => {
            const on = String(o.value) === String(value);
            return (
              <li key={String(o.value)} role="option" aria-selected={on} data-i={i} onMouseEnter={() => setCur(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)}
                className={cn("flex min-h-[44px] cursor-pointer items-center justify-between gap-3 px-4 py-2 text-[15px]", i === cur ? "bg-rose-mist" : "", on ? "font-bold text-rose-deep" : "text-ink")}>
                <span className="truncate">{o.label}</span>{on && <CheckOutlined aria-hidden className="shrink-0 text-[13px]" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
