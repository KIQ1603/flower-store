import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "search"
  | "bag"
  | "heart"
  | "arrowUpRight"
  | "arrowRight"
  | "plus"
  | "minus"
  | "close"
  | "star"
  | "leaf"
  | "sparkle"
  | "menu"
  | "truck"
  | "mail"
  | "phone"
  | "pin"
  | "clock"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "check"
  | "scissors"
  | "gift"
  | "quote"
  | "chevronDown"
  | "message"
  | "shield"
  | "calendar"
  | "flower";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  filled?: boolean;
};

const paths: Record<Exclude<IconName, "star">, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m16.2 16.2 4.3 4.3" />
    </>
  ),
  bag: (
    <>
      <path d="M5.6 8.2h12.8l1 12.3H4.6l1-12.3Z" />
      <path d="M9 10V6.7a3 3 0 0 1 6 0V10" />
    </>
  ),
  heart: (
    <path d="M12 20.3S4.4 16 4.4 9.9A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.6 2.7c0 6.1-7.6 10.4-7.6 10.4Z" />
  ),
  arrowUpRight: (
    <>
      <path d="M6.5 17.5 17.5 6.5" />
      <path d="M8 6.5h9.5V16" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4 12h15.5" />
      <path d="m14 6.5 5.5 5.5L14 17.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  leaf: (
    <>
      <path d="M20.5 3.5C10.5 3.5 4 8.4 4 16c0 2.4.7 3.9 1.4 4.6C7.8 13.8 12 10.8 18 9.2c-5.2 2.3-9.3 5.9-12.6 11.3 9.1 0 15.1-6.4 15.1-17Z" />
      <path d="M4.7 20.3c2.6-4.4 5.9-7.3 9.3-9.1" />
    </>
  ),
  sparkle: (
    <path d="M12 2.8c.7 5.4 2.9 7.6 8.3 8.3-5.4.7-7.6 2.9-8.3 8.3-.7-5.4-2.9-7.6-8.3-8.3 5.4-.7 7.6-2.9 8.3-8.3Z" />
  ),
  menu: (
    <>
      <path d="M4 8h16" />
      <path d="M4 16h11" />
    </>
  ),
  truck: (
    <>
      <path d="M2.8 6.5h10.4v9.6H2.8z" />
      <path d="M13.2 10.5h3.6l3.4 3.3v2.3h-7z" />
      <circle cx="6.8" cy="18.2" r="1.8" />
      <circle cx="17.3" cy="18.2" r="1.8" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.4" width="18" height="13.2" rx="2.2" />
      <path d="m3.8 7 8.2 6 8.2-6" />
    </>
  ),
  phone: (
    <path d="M7 3.6h2.6l1.5 3.8-2 1.3a11.4 11.4 0 0 0 5.2 5.2l1.3-2 3.8 1.5V16a2.4 2.4 0 0 1-2.4 2.4C10.6 18.4 5.6 13.4 5.6 7.1V6a2.4 2.4 0 0 1 1.4-2.4Z" />
  ),
  pin: (
    <>
      <path d="M12 21.4s7.1-5.6 7.1-11.2A7.1 7.1 0 1 0 4.9 10.2C4.9 15.8 12 21.4 12 21.4Z" />
      <circle cx="12" cy="10.1" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3.1 1.9" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="5" />
      <circle cx="12" cy="12" r="3.7" />
      <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path d="M14.8 8.6h2.6V5.2h-2.8c-2.7 0-4.1 1.8-4.1 4.3v2.1H8v3.4h2.5v6.2h3.7v-6.2h2.6l.5-3.4h-3.1V9.6c0-.7.2-1 1.1-1Z" />
  ),
  tiktok: (
    <>
      <path d="M13.8 3.6v10.7a3.8 3.8 0 1 1-3.2-3.7" />
      <path d="M13.8 3.6c.4 2.9 2.2 4.6 5.1 4.9" />
    </>
  ),
  check: (
    <>
      <path d="m4.8 12.3 4.6 4.6L19.4 6.9" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6.2" cy="6.8" r="2.4" />
      <circle cx="6.2" cy="17.2" r="2.4" />
      <path d="M8.2 8.4 19.8 16" />
      <path d="M8.2 15.6 19.8 8" />
    </>
  ),
  gift: (
    <>
      <path d="M4 9.4h16v11.2H4z" />
      <path d="M3 9.4h18V13H3z" />
      <path d="M12 9.4v11.2" />
      <path d="M12 9.4C10 9.4 7.3 8.8 7.3 6.5A2.4 2.4 0 0 1 12 5.6a2.4 2.4 0 0 1 4.7.9c0 2.3-2.7 2.9-4.7 2.9Z" />
    </>
  ),
  quote: (
    <path
      d="M9.6 5.6C6.4 7 4.6 9.6 4.6 13c0 3.2 1.7 5.2 4.2 5.2 2.3 0 3.9-1.6 3.9-3.8 0-2.1-1.4-3.5-3.3-3.5-.3 0-.6 0-.8.1.4-1.6 1.5-2.9 3.2-3.9l-2.2-1.5Zm9.2 0c-3.2 1.4-5 4-5 7.4 0 3.2 1.7 5.2 4.2 5.2 2.3 0 3.9-1.6 3.9-3.8 0-2.1-1.4-3.5-3.3-3.5-.3 0-.6 0-.8.1.4-1.6 1.5-2.9 3.2-3.9l-2.2-1.5Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  chevronDown: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  message: (
    <>
      <path d="M3.6 5.8h16.8v10.9H9.4l-5.8 3.4V5.8Z" />
      <path d="M8 10.5h8" />
      <path d="M8 13.2h5" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3.2 7 2.9v5.8c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6.1l7-2.9Z" />
      <path d="m8.8 11.8 2.2 2.2 4.3-4.3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2.2" />
      <path d="M8 3.4v3.8" />
      <path d="M16 3.4v3.8" />
      <path d="M3.6 10.2h16.8" />
    </>
  ),
  flower: (
    <>
      <circle cx="12" cy="12" r="2.3" />
      <ellipse cx="12" cy="6.4" rx="2.5" ry="3.1" />
      <ellipse cx="12" cy="6.4" rx="2.5" ry="3.1" transform="rotate(72 12 12)" />
      <ellipse cx="12" cy="6.4" rx="2.5" ry="3.1" transform="rotate(144 12 12)" />
      <ellipse cx="12" cy="6.4" rx="2.5" ry="3.1" transform="rotate(216 12 12)" />
      <ellipse cx="12" cy="6.4" rx="2.5" ry="3.1" transform="rotate(288 12 12)" />
    </>
  ),
};

export function Icon({ name, size = 20, filled = false, className, strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {name === "star" ? (
        <path
          d="M12 3.4 14.7 9l6 .8-4.4 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.3 9.8l6-.8L12 3.4Z"
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
        />
      ) : (
        paths[name]
      )}
    </svg>
  );
}

export function BloomMark({ className, strokeWidth = 1.3 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 23.5V36" />
      <path d="M20 29.5c-3.8.1-6-2-6.4-5.6 3.8-.2 6 2 6.4 5.6Z" />
      <path d="M20 33.4c3.1 0 5.2-1.7 5.8-4.8-3.1-.1-5.2 1.6-5.8 4.8Z" />
      <circle cx="20" cy="15.4" r="2.1" />
      <ellipse cx="20" cy="8.4" rx="3" ry="3.7" />
      <ellipse cx="20" cy="8.4" rx="3" ry="3.7" transform="rotate(72 20 15.4)" />
      <ellipse cx="20" cy="8.4" rx="3" ry="3.7" transform="rotate(144 20 15.4)" />
      <ellipse cx="20" cy="8.4" rx="3" ry="3.7" transform="rotate(216 20 15.4)" />
      <ellipse cx="20" cy="8.4" rx="3" ry="3.7" transform="rotate(288 20 15.4)" />
    </svg>
  );
}

export function Stars({ count = 5, size = 12, className }: { count?: number; size?: number; className?: string }) {
  return (
    <span className={className} aria-label={`${count} trên 5 sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="star" size={size} filled={i < count} strokeWidth={1.2} className="inline-block" />
      ))}
    </span>
  );
}

export function DoodleSprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M66 155C62 120 56 88 38 55c-8-15-16-26-28-35" />
      <path d="M58 118c-15-4-25 2-30 15 13 3 24-3 30-15Z" />
      <path d="M52 98c15-6 26-1 31 12-13 4-25-1-31-12Z" />
      <path d="M45 78c-13-2-21 5-23 17 12 1 20-6 23-17Z" />
      <path d="M40 61c12-7 23-3 29 8-11 5-23 2-29-8Z" />
      <path d="M30 42c-8-13-3-25 10-30 5 12 0 24-10 30Z" />
      <circle cx="40" cy="26" r="8" />
      <circle cx="26" cy="37" r="6" />
      <path d="M37 19c7-6 16-5 22 2" />
    </svg>
  );
}
