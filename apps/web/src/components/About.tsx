import { Icon, BloomMark, DoodleSprig } from "./Icons";
import { ChibiPortrait, Squiggle } from "./Illustrations";
import { Reveal } from "./Reveal";
import { Tilt3DCard } from "./Tilt3DCard";

export function About({ onConsult }: { onConsult: () => void }) {
  return (
    <section id="nguoi-giu-vuon" className="relative z-10 py-20 lg:py-28">
      <div className="container-x">
        <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          {/* 3D illustration panel */}
          <Reveal from="left" className="relative order-2 lg:order-1">
            <div className="relative mx-auto max-w-[480px]">
              <Tilt3DCard maxTilt={10} scale={1.015}>
                <div className="layer-z-mid relative overflow-hidden rounded-[38px_38px_38px_130px] border border-sage/45 bg-sage-mist/85 px-4 pt-9 pb-4 shadow-[0_45px_85px_-55px_rgba(74,86,71,0.75)] sm:rounded-[38px_38px_38px_150px] sm:px-5 sm:pt-10">
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-4 top-5 bottom-4 rounded-[30px_30px_30px_112px] border border-dashed border-sage/45 sm:inset-x-5 sm:top-6 sm:rounded-[32px_32px_32px_130px]"
                  />
                  <DoodleSprig className=" absolute top-10 left-4 h-24 w-16 -rotate-12 text-sage/60 sm:top-8 sm:left-5 sm:h-28 sm:w-20" />
                  <DoodleSprig className="absolute top-16 right-3 h-20 w-14 rotate-[164deg] text-sage/50 sm:right-4 sm:h-24 sm:w-16" />
                  <span className="layer-z-pop absolute top-5 right-4 z-10 grid h-14 w-14 rotate-6 place-items-center rounded-full border border-sage-deep/25 bg-paper/90 text-center font-serif text-[10px] leading-tight tracking-[0.06em] text-sage-deep shadow-sm backdrop-blur-sm sm:top-6 sm:right-6 sm:h-16 sm:w-16 sm:text-[11px]">
                    từ
                    <br />
                    <span className="text-[17px] leading-none sm:text-[20px]">2018</span>
                  </span>

                  <div className="layer-z-front relative mx-auto w-[76%] max-w-[300px] sm:w-[80%] sm:max-w-[300px]">
                    <ChibiPortrait className="h-auto w-full drop-shadow-[0_18px_22px_rgba(62,74,59,0.16)]" />
                  </div>

                  <div className="layer-z-pop relative z-10 mt-1 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-line/70 bg-paper/95 px-3 py-2 shadow-sm backdrop-blur-sm">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sage-soft/70 text-sage-deep">
                        <Icon name="leaf" size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[7.5px] tracking-[0.16em] text-ink-faint uppercase">Hôm nay tiệm có</p>
                        <p className="truncate text-[10.5px] font-medium text-ink">Hồng Juliet · Tulip</p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 text-[8px] tracking-[0.1em] text-sage-deep uppercase">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage-deep" />
                      đang cắm hoa
                    </span>
                  </div>

                  <div className="layer-z-front relative z-10 mt-4 flex items-center gap-3 border-t border-sage/30 pt-3">
                    <img
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
                      onError={(e) => {
                        e.currentTarget.src = "/images/florist.svg";
                      }}
                      alt="Mộc, người giữ vườn, đang chọn hoa tại tiệm"
                      className="h-14 w-14 shrink-0 rounded-full border-2 border-paper object-cover object-center shadow-sm"
                    />
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-medium text-ink">Nguyễn Mộc · người sáng lập</p>
                      <p className="hand mt-0.5 truncate text-[16px] leading-none text-ink-soft">
                        một sáng thứ Bảy bình thường, rất vui
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating 3D Speech Note */}
                <div className="layer-z-pop absolute -top-5 -left-2 flex items-center gap-2 rounded-full border border-line bg-paper py-1.5 pr-4 pl-2 shadow-[0_20px_38px_-22px_rgba(70,54,40,0.75)] sm:-left-6">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-soft text-rose-deep">
                    <BloomMark className="h-4 w-4" />
                  </span>
                  <span className="hand text-[17px] leading-none text-ink">Chào bạn, mình là Mộc!</span>
                </div>
              </Tilt3DCard>
            </div>
          </Reveal>

          {/* story */}
          <div className="order-1 max-w-[550px] lg:order-2">
            <Reveal>
              <p className="eyebrow">
                <span className="h-px w-7 bg-rose-deep/60" />
                Người giữ vườn
                <span className="ml-1 font-serif text-[13px] tracking-normal text-ink-faint italic normal-case">
                  No. 03
                </span>
              </p>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="display mt-4 text-[clamp(2.1rem,4.4vw,3.3rem)] leading-[1.08] text-ink">
                <span className="block">Hoa là cách nói thật lòng,</span>
                <span className="relative mt-1 inline-block italic text-shimmer">
                  khi lời chưa kịp
                  <Squiggle className="absolute -bottom-2 left-0 h-2.5 w-full text-rose/70" />
                </span>
                <span className="text-ink">.</span>
              </h2>
            </Reveal>
            <Reveal delay={130}>
              <p className="mt-7 text-[13px] leading-[1.95] font-light text-ink-soft">
                Mình mở Mây &amp; Mộc vào một sáng mùa thu 2018, với một chiếc bàn gỗ cũ và hai xô hồng vừa hái. Ngày
                đó mình chỉ nghĩ: giá mà có một nơi ai cũng dám ghé vào, kể một câu chuyện thật lòng, rồi mang về một bó
                hoa vừa vặn với câu chuyện ấy.
              </p>
              <p className="mt-4 text-[13px] leading-[1.95] font-light text-ink-soft">
                Tám năm sau, tiệm vẫn nhỏ như thế. Vẫn tự tay ra vườn lúc sớm, tự chọn giấy, tự viết từng tấm thiệp.
                Bởi mình tin điều làm nên một bó hoa không phải số cành — mà là{" "}
                <span className="italic text-ink">người ta đang nghĩ đến ai khi cắm nó.</span>
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-8 grid grid-cols-3 divide-x divide-line/80 border-y border-line/80 py-5">
                {[
                  { value: "8", label: "mùa hoa đã đi qua" },
                  { value: "1.286", label: "bó hoa trao tay" },
                  { value: "4.9/5", label: "từ người nhận hoa" },
                ].map((stat) => (
                  <div key={stat.label} className="px-3 first:pl-0 last:pr-0">
                    <p className="font-serif text-[30px] leading-none text-rose-deep">{stat.value}</p>
                    <p className="mt-1.5 text-[9.5px] leading-snug tracking-[0.04em] text-ink-soft">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={250}>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
                <button type="button" onClick={onConsult} className="btn btn-primary">
                  <span>Trò chuyện cùng Mộc</span>
                  <span className="btn-ic">
                    <Icon name="arrowUpRight" size={14} />
                  </span>
                </button>
                <a
                  href="#chuyen-hoa"
                  className="link-underline inline-flex items-center gap-2 self-start text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase transition-colors hover:text-rose-deep sm:ml-2"
                >
                  Những lời sau khi hoa đến
                  <Icon name="arrowRight" size={14} />
                </a>
              </div>
              <p className="hand mt-6 rotate-[-1.5deg] text-[24px] text-sage-deep">— Mộc, người giữ vườn.</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
