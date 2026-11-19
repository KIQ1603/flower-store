import { useState } from "react";
import { Icon } from "./Icons";
import { ChibiGift } from "./Illustrations";
import { Reveal } from "./Reveal";
import { faqs } from "../data";
import { cn } from "../utils/cn";

export function Faq({ onConsult }: { onConsult: () => void }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="hoi-dap" className="relative z-10 overflow-hidden py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-20 -left-24 h-[360px] w-[360px] rounded-full bg-sage-soft/35 blur-[100px]"
      />
      <div className="container-x relative grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
        <div>
          <Reveal>
            <p className="eyebrow">
              <span className="h-px w-7 bg-rose-deep/60" />
              Trước khi bạn nhắn
              <span className="font-serif text-[13px] tracking-normal text-ink-faint italic normal-case">No. 05</span>
            </p>
          </Reveal>
          <Reveal delay={70}>
            <h2 className="display mt-4 max-w-[400px] text-[clamp(2.2rem,4.4vw,3.2rem)] text-ink">
              Vài điều bạn có thể đang <span className="italic text-rose-deep">băn khoăn</span>
            </h2>
          </Reveal>
          <Reveal delay={130}>
            <div className="relative mt-8 max-w-[330px]">
              <ChibiGift className="w-[230px]" />
              <p className="hand mt-3 ml-20 -rotate-2 text-[21px] leading-tight text-sage-deep">
                Mộc trả lời từng tin nhắn,
                <br />
                không phải trợ lý ảo.
              </p>
            </div>
            <p className="mt-4 max-w-[300px] text-[12px] leading-[1.85] font-light text-ink-soft">
              Nếu câu hỏi của bạn chưa có ở đây, cứ nhắn. Kể cả khi bạn chỉ muốn hỏi giá trước.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button type="button" onClick={onConsult} className="btn btn-outline">
                <span>Nhắn Mộc</span>
                <span className="btn-ic">
                  <Icon name="message" size={14} />
                </span>
              </button>
              <a href="tel:0912345678" className="flex items-center gap-2 text-[11px] text-ink-soft transition-colors hover:text-ink">
                <Icon name="phone" size={14} className="text-sage-deep" />
                0912 345 678
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={100}>
          <div className="border-t border-line">
            {faqs.map((faq, index) => {
              const isOpen = open === index;
              return (
                <div key={faq.q} className="border-b border-line">
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${index}`}
                      id={`faq-button-${index}`}
                      className="group flex w-full items-start justify-between gap-5 py-5 text-left"
                    >
                      <span className="flex items-start gap-4">
                        <span className="mt-0.5 font-serif text-[12px] tracking-[0.08em] text-ink-faint">
                          0{index + 1}
                        </span>
                        <span
                          className={cn(
                            "font-serif text-[19px] leading-snug transition-colors duration-300 sm:text-[21px]",
                            isOpen ? "text-rose-deep" : "text-ink group-hover:text-rose-deep"
                          )}
                        >
                          {faq.q}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-500",
                          isOpen
                            ? "rotate-45 border-rose-deep bg-rose-deep text-cream"
                            : "border-line bg-paper/60 text-ink-soft group-hover:border-sage group-hover:text-sage-deep"
                        )}
                      >
                        <Icon name="plus" size={14} />
                      </span>
                    </button>
                  </h3>
                  <div className="accordion-grid" data-open={isOpen} id={`faq-panel-${index}`} role="region" aria-labelledby={`faq-button-${index}`}>
                    <div className="accordion-inner">
                      <p className="max-w-[560px] pb-6 pl-0 text-[12px] leading-[1.9] font-light text-ink-soft sm:pl-8">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex items-center gap-2 text-[10px] text-ink-faint">
            <Icon name="clock" size={13} className="text-sage-deep" />
            Mộc trả lời trong giờ mở tiệm, 8:00 – 20:00 mỗi ngày.
          </div>
        </Reveal>
      </div>
    </section>
  );
}
