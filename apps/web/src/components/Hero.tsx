import { BloomMark } from "./Icons";
import { BlossomTreeHero } from "./BlossomTreeHero";

type HeroProps = {
  onConsult: () => void;
  onAdd: (id: number) => void;
};

export function Hero({ onConsult }: HeroProps) {
  return <BlossomTreeHero onConsult={onConsult} />;
}

const marqueeItems = [
  "Lướt qua tán cây để thổi gió mưa hoa",
  "Cánh hoa rơi ghép tên người thương",
  "Hoa tươi hái mới mỗi 5:30 sáng",
  "Giao tận tay trong 2 giờ tại Hà Nội",
  "Tặng kèm thiệp viết tay miễn phí",
];

export function TrustMarquee() {
  return (
    <div className="relative z-10 border-y border-line/70 bg-[#231b32] text-[#f5dfe6]">
      <div className="marquee py-3.5">
        <div className="marquee-track">
          {[0, 1].map((group) => (
            <div key={group} className="flex shrink-0 items-center" aria-hidden={group === 1}>
              {marqueeItems.map((item) => (
                <div key={`${group}-${item}`} className="flex items-center gap-7 pr-7">
                  <span className="flex items-center gap-3">
                    <BloomMark className="h-4 w-4 text-[#f39bb2]" />
                    <span className="font-serif text-[18px] tracking-[0.01em] text-[#f6dfe4] italic sm:text-[19px]">
                      {item}
                    </span>
                  </span>
                  <span className="h-1.5 w-1.5 rotate-45 bg-[#efb08a]/75" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
