import { useNavigate } from "react-router-dom";
import { FloraTree } from "../../components/FloraTree";
import { BloomMark } from "../../components/Icons";
import { Squiggle } from "../../components/Illustrations";
import { RegionPicker } from "../RegionPicker";
import { useRegion } from "../region";
import { money } from "../api";
import { EnvironmentOutlined } from "@ant-design/icons";
import { HomeSections } from "../HomeSections";

export function Home() {
  const nav = useNavigate();
  const { region, setRegion, openPicker } = useRegion();
  return (
    <>
    <FloraTree>
      <div className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 py-1.5 pr-4 pl-2 text-[#f9dfe6] backdrop-blur-md">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e58ca4]/30 text-[#ffd2df]"><BloomMark className="h-3.5 w-3.5" /></span>
        <span className="text-[9.5px] font-medium tracking-[0.22em] uppercase">Florea by FloraHub · Hoa tươi giao tận nơi</span>
      </div>
      <h1 className="display mt-5 text-[clamp(2.1rem,min(5.2vw,7.4svh),4.2rem)] leading-[1.02] text-[#fff6f8] drop-shadow-[0_4px_24px_rgba(15,8,24,0.65)]">
        <span className="hero-word-1 block">Trao Gửi Yêu Thương,</span>
        <span className="hero-word-2 mt-1 block text-[#f7a8be]">Nở Hoa Cảm Xúc</span>
        <Squiggle className="mt-2 h-3 w-[62%] max-w-[270px] text-[#f7a8be]/80" />
      </h1>
      <p className="mt-4 hidden max-w-[450px] text-[15px] leading-[1.7] text-[#eddbe2]/90 [@media(min-height:820px)]:block">
        Chọn khu vực bạn muốn gửi hoa, ngắm mẫu hoa tươi trong ngày và nhận ảnh bó hoa thực tế để duyệt trước khi giao.
      </p>

      <div className="pointer-events-auto mt-5 w-full max-w-[460px] rounded-3xl border border-white/25 bg-[#1e162b]/75 p-4 shadow-xl backdrop-blur-xl sm:p-5">
        {region ? (
          <div>
            <p className="text-[11.5px] font-semibold tracking-wide text-[#f3ced9]">Khu vực nhận hoa của bạn</p>
            <p className="mt-1 font-serif text-[24px] font-extrabold text-white"><EnvironmentOutlined aria-hidden className="mr-1.5" />{region.wardName}, {region.provinceName}</p>
            <p className="mt-1 text-[13px] text-[#f6dfe4]">Phí giao: <b>{money(region.deliveryFee)}</b></p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button onClick={() => nav("/hoa-tuoi")} className="btn bg-[#d96b87] text-white hover:bg-[#c45672]"><span>Xem mẫu hoa trong khu vực</span></button>
              <button onClick={openPicker} className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20"><span>Đổi khu vực</span></button>
              <button onClick={() => setRegion(null)} className="px-2 text-[12.5px] text-[#dec4ce] underline">Bỏ chọn</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 font-serif text-[22px] font-extrabold text-white">Bạn muốn gửi hoa đến đâu?</p>
            <RegionPicker dark onDone={() => nav("/hoa-tuoi")} />
          </div>
        )}
      </div>
    </FloraTree>
    <HomeSections />
    </>
  );
}
