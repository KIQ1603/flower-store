import { Icon, Stars } from "./Icons";
import { CircularStamp } from "./Illustrations";
import { Reveal } from "./Reveal";
import { Tilt3DCard } from "./Tilt3DCard";

export function Bespoke({ onConsult }: { onConsult: () => void }) {
  return (
    <section className="relative z-10 overflow-hidden bg-ink py-16 text-cream lg:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 80% at 82% 20%, rgba(183,140,120,0.24) 0%, transparent 60%), radial-gradient(40% 60% at 8% 90%, rgba(120,144,112,0.22) 0%, transparent 65%)",
        }}
      />
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal from="left" className="relative order-2 lg:order-1">
          <div className="relative mx-auto max-w-[420px]">
            <Tilt3DCard maxTilt={11} scale={1.02}>
              <div className="layer-z-mid overflow-hidden rounded-t-[200px] rounded-b-[24px] border border-cream/20 bg-white/5 p-2 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.65)]">
                <div className="overflow-hidden rounded-t-[190px] rounded-b-[16px]">
                  <img
                    src="https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?auto=format&fit=crop&w=900&q=85"
                    onError={(e) => {
                      e.currentTarget.src = "/images/hands-peony.svg";
                    }}
                    alt="Đôi tay trao nhau bó mẫu đơn trong ánh sáng dịu"
                    className="aspect-[4/5] w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              <CircularStamp className="layer-z-pop absolute -right-3 -bottom-5 w-[92px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] sm:w-[106px]" />
              <span className="layer-z-front hand absolute -bottom-6 left-2 rotate-[-3deg] text-[22px] text-cream/80">
                “gói cả lời chưa nói”
              </span>
            </Tilt3DCard>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <Reveal>
            <p className="eyebrow !text-cream/60">
              <span className="h-px w-7 bg-cream/40" />
              Hoa theo yêu cầu
            </p>
          </Reveal>
          <Reveal delay={70}>
            <h2 className="display mt-4 max-w-[600px] text-[clamp(2.25rem,4.6vw,3.6rem)] text-cream">
              Không cần là người sành hoa.
              <br />
              <span className="italic text-rose">Kể Mộc nghe câu chuyện,</span>
              <br />
              Mộc chọn hoa cho bạn.
            </h2>
          </Reveal>
          <Reveal delay={130}>
            <p className="mt-5 max-w-[480px] text-[13px] leading-[1.9] font-light text-cream/70">
              Một người bạn sắp chuyển nhà, một lời xin lỗi khó nói, một ngày mẹ quên mất sinh nhật mình. Bạn kể, Mộc
              nghe — rồi gửi lại vài phương án cùng khoảng giá trước khi làm.
            </p>
          </Reveal>

          <Reveal delay={190}>
            <div className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {[
                { icon: "message" as const, title: "Florist trực tiếp", copy: "Nhắn 1:1 với Mộc, không qua máy" },
                { icon: "gift" as const, title: "Ngân sách linh hoạt", copy: "Từ 350.000₫, đẹp không hẳn nhiều cành" },
                { icon: "mail" as const, title: "Thiệp viết tay", copy: "Mộc viết đúng lời bạn dặn, miễn phí" },
                { icon: "truck" as const, title: "Giao đúng khoảnh khắc", copy: "Hẹn giờ, giữ kín người nhận nếu cần" },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-cream/15 bg-cream/[0.06] text-rose">
                    <Icon name={feature.icon} size={15} />
                  </span>
                  <div>
                    <p className="text-[11.5px] font-medium text-cream">{feature.title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-cream/50">{feature.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={250}>
            <div className="mt-9 flex flex-col gap-4 border-t border-cream/15 pt-7 sm:flex-row sm:items-center">
              <button type="button" onClick={onConsult} className="btn btn-cream">
                <span>Đặt hoa riêng cùng Mộc</span>
                <span className="btn-ic">
                  <Icon name="arrowUpRight" size={14} />
                </span>
              </button>
              <div className="flex items-center gap-2.5 sm:ml-2">
                <a
                  href="tel:0912345678"
                  className="text-[12px] font-medium text-cream/85 transition-colors hover:text-cream"
                >
                  0912 345 678
                </a>
                <span className="h-1 w-1 rounded-full bg-cream/30" />
                <span className="text-[10px] tracking-[0.06em] text-cream/45">Tư vấn trong 15 phút</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-cream/60">
              <Stars count={5} size={10} className="text-rose" />
              <span className="text-[10px]">“Mộc hiểu ý mình còn hơn mình hiểu hoa.”</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
