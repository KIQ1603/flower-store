import { useNavigate } from "react-router-dom";
import { FloraTree } from "../../components/FloraTree";
import { Squiggle } from "../../components/Illustrations";
import { RegionPicker } from "../RegionPicker";
import { useRegion } from "../region";
import { money } from "../api";
import { EnvironmentOutlined } from "@ant-design/icons";
import { useTheme } from "../theme";
import { HomeSections } from "../HomeSections";

export function Home() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const { region, setRegion, openPicker } = useRegion();
  return (
    <>
    <FloraTree>
      <div className="inline-flex items-center gap-2.5 rounded-full border border-(--hero-line) bg-(--hero-glass) py-1.5 pr-4 pl-2 text-(--hero-chip) backdrop-blur-md">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/80"><img src="/favicon-32.png" alt="" aria-hidden width={16} height={16} className="h-4 w-4" /></span>
        <span className="text-[9.5px] font-medium tracking-[0.22em] uppercase">Florea by FloraHub · Hoa tươi giao tận nơi</span>
      </div>
      <h1 className="display mt-5 text-[clamp(2.1rem,min(5.2vw,7.4svh),4.2rem)] leading-[1.02] text-(--hero-fg) drop-shadow-[0_4px_24px_var(--hero-shadow)]">
        <span className="hero-word-1 block">Trao Gửi Yêu Thương,</span>
        <span className="hero-word-2 mt-1 block text-(--hero-acc)">Nở Hoa Cảm Xúc</span>
        <Squiggle className="mt-2 h-3 w-[62%] max-w-[270px] text-(--hero-acc)/80" />
      </h1>
      <p className="mt-4 hidden max-w-[450px] text-[15px] leading-[1.7] text-(--hero-soft) [@media(min-height:820px)]:block">
        Chọn khu vực bạn muốn gửi hoa, ngắm mẫu hoa tươi trong ngày và nhận ảnh bó hoa thực tế để duyệt trước khi giao.
      </p>

      <div className="pointer-events-auto mt-5 w-full max-w-[460px] rounded-3xl border border-(--hero-line) bg-(--hero-card) p-4 shadow-xl backdrop-blur-xl sm:p-5">
        {region ? (
          <div>
            <p className="text-[11.5px] font-semibold tracking-wide text-(--hero-chip)">Khu vực nhận hoa của bạn</p>
            <p className="mt-1 font-serif text-[24px] font-extrabold text-(--hero-fg)"><EnvironmentOutlined aria-hidden className="mr-1.5" />{region.wardName}, {region.provinceName}</p>
            <p className="mt-1 text-[13px] text-(--hero-soft)">Phí giao: <b>{money(region.deliveryFee)}</b></p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button onClick={() => nav("/hoa-tuoi")} className="btn bg-[#d96b87] text-white hover:bg-[#c45672]"><span>Xem mẫu hoa trong khu vực</span></button>
              <button onClick={openPicker} className="btn border border-(--hero-line) bg-(--hero-glass) text-(--hero-fg) hover:bg-white/30"><span>Đổi khu vực</span></button>
              <button onClick={() => setRegion(null)} className="px-2 text-[12.5px] text-(--hero-soft) underline">Bỏ chọn</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 font-serif text-[22px] font-extrabold text-(--hero-fg)">Bạn muốn gửi hoa đến đâu?</p>
            <RegionPicker dark={theme === "dark"} onDone={() => nav("/hoa-tuoi")} />
          </div>
        )}
      </div>
    </FloraTree>
    <HomeSections />
    </>
  );
}
