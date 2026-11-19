import { useEffect, useRef } from "react";
import { EnvironmentOutlined } from "@ant-design/icons";
import { useRegion } from "./region";

/** Khách phải chọn tỉnh/thành và phường nhận hoa trước khi xem hoa: mỗi sản phẩm chỉ giao tại một địa điểm */
export function NeedRegion({ what = "hoa" }: { what?: string }) {
  const { openPicker } = useRegion();
  // Lần đầu vào trang trong phiên: tự mở hộp chọn khu vực (openPicker đổi mỗi lần vẽ lại nên giữ qua ref, hẹn giờ chỉ đặt một lần)
  const open = useRef(openPicker); open.current = openPicker;
  useEffect(() => {
    try { if (sessionStorage.getItem("florea-picker-auto")) return; } catch { /* bỏ qua */ }
    const t = setTimeout(() => { try { sessionStorage.setItem("florea-picker-auto", "1"); } catch { /* bỏ qua */ } open.current(); }, 350);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="grid place-items-center rounded-[32px] border border-line bg-white px-5 py-14 text-center shadow-[0_20px_50px_-40px_rgba(120,70,80,0.5)]" aria-label="Chọn khu vực nhận hoa">
      <div className="max-w-[460px]">
        <p className="text-[48px] text-rose-deep" aria-hidden><EnvironmentOutlined /></p>
        <h2 className="font-serif text-[28px] leading-tight font-extrabold text-ink">Bạn nhận {what} ở đâu?</h2>
        <p className="mt-2 text-[16px] leading-relaxed font-medium text-ink-soft">Mỗi sản phẩm chỉ giao tại một địa điểm. Hãy chọn <b className="text-ink">tỉnh/thành</b> và <b className="text-ink">phường/khu vực</b> nhận hoa để xem những mẫu giao tới bạn.</p>
        <button onClick={openPicker} className="btn mt-6 bg-[#d96b87] px-8 py-4 text-[16px] text-white hover:bg-[#c45672]"><span>Chọn khu vực nhận hoa</span></button>
      </div>
    </section>
  );
}
