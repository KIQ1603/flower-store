import { useState, type FormEvent } from "react";
import { BloomMark, DoodleSprig, Icon } from "./Icons";
import { Reveal } from "./Reveal";
import { navLinks } from "../data";

type FooterProps = {
  notify: (message: string) => void;
};

const socials = [
  { name: "instagram" as const, label: "Instagram", href: "https://instagram.com" },
  { name: "facebook" as const, label: "Facebook", href: "https://facebook.com" },
  { name: "tiktok" as const, label: "TikTok", href: "https://tiktok.com" },
];

export function Footer({ notify }: FooterProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");

  const subscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      return;
    }
    setStatus("done");
    notify("Đã gửi lời chào đến hộp thư của bạn.");
    setEmail("");
  };

  return (
    <footer id="lien-he" className="relative z-10 overflow-hidden bg-ink text-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(50% 60% at 92% 0%, rgba(183,140,120,0.20) 0%, transparent 65%), radial-gradient(45% 55% at 4% 100%, rgba(120,144,112,0.18) 0%, transparent 65%)",
        }}
      />
      <DoodleSprig className="pointer-events-none absolute top-16 right-8 h-40 w-28 rotate-12 text-cream/[0.10]" />

      <div className="container-x relative">
        {/* newsletter */}
        <Reveal>
          <div className="grid gap-8 border-b border-cream/12 py-12 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-16 lg:py-16">
            <div>
              <p className="eyebrow !text-cream/50">
                <span className="h-px w-7 bg-cream/35" />
                Lá thư từ vườn
              </p>
              <h2 className="display mt-4 max-w-[520px] text-[clamp(2rem,4vw,2.9rem)] text-cream">
                Một lá thư hoa,
                <br />
                <span className="italic text-rose">mỗi sáng thứ Sáu.</span>
              </h2>
              <p className="mt-3 max-w-[390px] text-[11.5px] leading-[1.85] font-light text-cream/55">
                Mẹo giữ hoa tươi lâu, chuyện hậu trường ở vườn và những bó hoa mới — viết tay, gửi đi thưa thớt, không
                làm bạn thấy ồn.
              </p>
            </div>

            <div>
              {status === "done" ? (
                <div className="flex items-start gap-3 rounded-2xl border border-cream/20 bg-cream/[0.06] p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose text-ink">
                    <Icon name="check" size={17} />
                  </span>
                  <div>
                    <p className="font-serif text-[21px] text-cream">Bạn đã ở trong vườn thư.</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-cream/55">
                      Hẹn gặp bạn sáng thứ Sáu tới, cùng một nhành hoa đang mùa.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={subscribe} noValidate>
                  <label htmlFor="newsletter-email" className="mb-1 block text-[9px] tracking-[0.18em] text-cream/45 uppercase">
                    Email của bạn
                  </label>
                  <div className="hairline-input">
                    <Icon name="mail" size={17} className="shrink-0 text-cream/45" />
                    <input
                      id="newsletter-email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (status === "error") setStatus("idle");
                      }}
                      placeholder="ban@nhaho.vn"
                      autoComplete="email"
                      aria-invalid={status === "error"}
                      aria-describedby={status === "error" ? "newsletter-error" : undefined}
                    />
                    <button
                      type="submit"
                      aria-label="Đăng ký nhận lá thư hoa"
                      className="group grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-ink transition-all duration-500 hover:bg-rose hover:text-ink"
                    >
                      <Icon name="arrowUpRight" size={16} className="transition-transform duration-500 group-hover:rotate-45" />
                    </button>
                  </div>
                  {status === "error" && (
                    <p id="newsletter-error" className="mt-2 text-[10px] text-rose">
                      Email chưa đúng, bạn xem lại nhé.
                    </p>
                  )}
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-[9px] text-cream/40">
                      <Icon name="shield" size={11} />
                      1 email mỗi tuần. Không quảng cáo.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Reveal>

        {/* main */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.9fr_1.2fr] lg:gap-10 lg:py-14">
          <div>
            <a href="#top" className="inline-flex items-center gap-2.5" aria-label="Mây & Mộc — về đầu trang">
              <span className="text-rose">
                <BloomMark className="h-10 w-10" />
              </span>
              <span className="flex flex-col">
                <span className="font-serif text-[28px] leading-[0.9] text-cream">
                  Mây <span className="italic text-rose">&</span> Mộc
                </span>
                <span className="mt-1.5 text-[7.5px] tracking-[0.34em] text-cream/45 uppercase">
                  florist atelier · Hà Nội
                </span>
              </span>
            </a>
            <p className="mt-5 max-w-[270px] text-[11.5px] leading-[1.9] font-light text-cream/55">
              Một tiệm hoa nhỏ làm việc chậm. Hoa hái trong ngày, gói bằng giấy mềm và gửi đi cùng một tấm thiệp viết
              tay — từ Hà Nội, từ 2018.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Mây & Mộc trên ${social.label}`}
                  className="grid h-9 w-9 place-items-center rounded-full border border-cream/15 text-cream/65 transition-all duration-300 hover:border-rose/60 hover:bg-cream/[0.06] hover:text-rose"
                >
                  <Icon name={social.name} size={15} />
                </a>
              ))}
              <span className="ml-2 flex items-center gap-1.5 text-[9px] tracking-[0.06em] text-cream/35">
                <span className="h-1 w-1 rounded-full bg-sage" />
                theo dõi mùa hoa
              </span>
            </div>
          </div>

          <div>
            <p className="text-[8.5px] font-medium tracking-[0.24em] text-cream/40 uppercase">Khám phá</p>
            <ul className="mt-4 space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-[11.5px] font-light text-cream/65 transition-colors hover:text-cream">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="#bo-suu-tap" className="text-[11.5px] font-light text-cream/65 transition-colors hover:text-cream">
                  Hoa theo yêu cầu
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[8.5px] font-medium tracking-[0.24em] text-cream/40 uppercase">Hỗ trợ</p>
            <ul className="mt-4 space-y-2.5">
              {[
                "Chính sách giao hoa",
                "Đổi hoa tận tay",
                "Bảo mật thông tin",
                "Câu hỏi thường gặp",
                "Hướng dẫn giữ hoa",
              ].map((item) => (
                <li key={item}>
                  <a href="#hoi-dap" className="text-[11.5px] font-light text-cream/65 transition-colors hover:text-cream">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[8.5px] font-medium tracking-[0.24em] text-cream/40 uppercase">Ghé thăm tiệm</p>
            <ul className="mt-4 space-y-3 text-[11.5px] leading-relaxed font-light text-cream/65">
              <li className="flex items-start gap-2.5">
                <Icon name="pin" size={14} className="mt-0.5 shrink-0 text-rose/80" />
                <span>
                  24 Ngõ Hoa, Tây Hồ
                  <br />
                  Hà Nội, Việt Nam
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Icon name="clock" size={14} className="shrink-0 text-rose/80" />
                8:00 – 20:00 · mỗi ngày
              </li>
              <li>
                <a href="tel:0912345678" className="flex items-center gap-2.5 transition-colors hover:text-cream">
                  <Icon name="phone" size={14} className="shrink-0 text-rose/80" />
                  0912 345 678
                </a>
              </li>
              <li>
                <a href="mailto:hello@maymoc.vn" className="flex items-center gap-2.5 transition-colors hover:text-cream">
                  <Icon name="mail" size={14} className="shrink-0 text-rose/80" />
                  hello@maymoc.vn
                </a>
              </li>
            </ul>
            <p className="hand mt-5 -rotate-2 text-[19px] leading-tight text-rose/80">
              ghé tiệm, mình pha trà.
            </p>
          </div>
        </div>

        {/* bottom bar */}
        <div className="flex flex-col gap-4 border-t border-cream/12 py-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[9.5px] tracking-[0.02em] text-cream/40">
            © 2026 Mây &amp; Mộc Florist Atelier · GPKD 01F-8000000000 · Làm bằng tay tại Hà Nội.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="#hoi-dap" className="text-[9.5px] text-cream/45 transition-colors hover:text-cream">
              Điều khoản
            </a>
            <a href="#hoi-dap" className="text-[9.5px] text-cream/45 transition-colors hover:text-cream">
              Bảo mật
            </a>
            <span className="hidden h-3 w-px bg-cream/15 sm:block" />
            <span className="text-[9px] tracking-[0.08em] text-cream/30 uppercase">Visa · Momo · Chuyển khoản</span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="ml-1 grid h-8 w-8 place-items-center rounded-full border border-cream/15 text-cream/60 transition-all duration-300 hover:border-rose/60 hover:text-rose"
              aria-label="Về đầu trang"
            >
              <Icon name="arrowUpRight" size={14} className="-rotate-45" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
