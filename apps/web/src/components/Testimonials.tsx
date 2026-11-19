import { Icon, Stars } from "./Icons";
import { MiniAvatar } from "./Illustrations";
import { Reveal } from "./Reveal";
import { testimonials } from "../data";
import { cn } from "../utils/cn";

export function Testimonials() {
  return (
    <section id="chuyen-hoa" className="relative z-10 border-b border-line/70 bg-paper/70 py-20 lg:py-28">
      <div className="container-x">
        <div className="mx-auto max-w-[640px] text-center">
          <Reveal>
            <p className="eyebrow justify-center">
              <span className="h-px w-7 bg-rose-deep/60" />
              Chuyện hoa
              <span className="font-serif text-[13px] tracking-normal text-ink-faint italic normal-case">No. 04</span>
            </p>
          </Reveal>
          <Reveal delay={70}>
            <h2 className="display mt-4 text-[clamp(2.2rem,4.8vw,3.4rem)] text-ink">
              Điều ở lại <span className="italic text-rose-deep">sau khi hoa tàn</span>
            </h2>
          </Reveal>
          <Reveal delay={130}>
            <p className="mx-auto mt-4 max-w-[430px] text-[12.5px] leading-[1.85] font-light text-ink-soft">
              Những lời nhắn được gửi lại sau khi hoa đã đến tay người nhận — chúng mình giữ tất cả, vì đó là lý do tiệm
              còn mở cửa.
            </p>
            <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-line bg-cream px-4 py-2">
              <span className="text-gold">
                <Stars count={5} size={12} />
              </span>
              <span className="text-[11px] font-medium text-ink">4.9/5</span>
              <span className="h-3 w-px bg-line" />
              <span className="flex items-center gap-1.5 text-[10px] text-ink-soft">
                <Icon name="shield" size={12} className="text-sage-deep" />
                1.286 đánh giá thật
              </span>
            </div>
          </Reveal>
        </div>

        <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {testimonials.map((item, index) => (
            <Reveal key={item.name} delay={index * 120} from="scale" className="h-full">
              <figure
                className={cn(
                  "flex h-full flex-col rounded-[22px] border p-6 transition-transform duration-500 hover:-translate-y-1.5 sm:p-7",
                  item.featured
                    ? "border-sage-deep bg-sage-deep text-cream shadow-[0_36px_70px_-50px_rgba(74,86,71,0.9)]"
                    : "border-line/80 bg-cream/80 text-ink"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon
                    name="quote"
                    size={30}
                    className={item.featured ? "text-rose/70" : "text-rose/60"}
                  />
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[8px] tracking-[0.14em] uppercase",
                      item.featured ? "border-cream/20 text-cream/70" : "border-line text-ink-faint"
                    )}
                  >
                    {item.occasion}
                  </span>
                </div>

                <blockquote
                  className={cn(
                    "mt-5 flex-1 font-serif text-[19px] leading-[1.55]",
                    item.featured ? "text-cream/95" : "text-ink"
                  )}
                >
                  &ldquo;{item.quote}&rdquo;
                </blockquote>

                <div
                  className={cn(
                    "mt-6 flex items-center gap-3 border-t pt-4",
                    item.featured ? "border-cream/15" : "border-line/80"
                  )}
                >
                  <MiniAvatar
                    variant={item.avatar}
                    className={cn("h-9 w-9 rounded-full", item.featured ? "ring-2 ring-cream/25" : "ring-2 ring-paper")}
                  />
                  <figcaption>
                    <p className={cn("text-[11.5px] font-medium", item.featured ? "text-cream" : "text-ink")}>{item.name}</p>
                    <p className={cn("mt-0.5 text-[9.5px]", item.featured ? "text-cream/55" : "text-ink-faint")}>
                      {item.meta}
                    </p>
                  </figcaption>
                  <span className={cn("ml-auto", item.featured ? "text-rose" : "text-gold")}>
                    <Stars count={5} size={9} />
                  </span>
                </div>
              </figure>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 text-[10px] text-ink-faint sm:flex-row">
            <span className="flex items-center gap-2">
              <Icon name="check" size={13} className="text-sage-deep" />
              Đánh giá được xác thực từ đơn hàng thật
            </span>
            <a
              href="#bo-suu-tap"
              className="link-underline flex items-center gap-2 tracking-[0.08em] uppercase transition-colors hover:text-ink"
            >
              Tìm bó hoa cho câu chuyện của bạn
              <Icon name="arrowRight" size={13} />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
