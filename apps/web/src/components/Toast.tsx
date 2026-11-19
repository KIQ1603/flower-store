import { Icon } from "./Icons";
import { cn } from "../utils/cn";

type ToastProps = {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
};

export function Toast({ message, actionLabel, onAction }: ToastProps) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex justify-center px-4 transition-all duration-500 sm:bottom-7",
        message ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      {message && (
        <div
          key={message}
          className="modal-in pointer-events-auto flex max-w-[440px] items-center gap-3 rounded-full border border-cream/15 bg-ink py-2.5 pr-2.5 pl-4 text-cream shadow-[0_24px_50px_-20px_rgba(33,40,32,0.7)]"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sage-deep/50 text-sage-soft">
            <Icon name="check" size={13} strokeWidth={2} />
          </span>
          <p className="text-[11px] leading-snug text-cream/90">{message}</p>
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="ml-1 shrink-0 rounded-full bg-cream px-3 py-1.5 text-[9.5px] font-medium tracking-[0.04em] text-ink transition-colors hover:bg-rose hover:text-ink"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
