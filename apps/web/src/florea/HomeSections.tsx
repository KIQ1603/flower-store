import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRightOutlined, CameraOutlined, CheckCircleOutlined, EnvironmentOutlined, GiftOutlined, MailOutlined, ShopOutlined } from "@ant-design/icons";
import { api } from "./api";
import { ProductCard, type ProductCardData } from "./ProductCard";
import { PostTile, type PostCard } from "./pages/BlogPages";
import { useRegion } from "./region";
import { useCardTypes } from "./cardTypes";
import { useShopInfo } from "./shopInfo";

function Head({ title, sub, to, cta }: { title: string; sub?: string; to?: string; cta?: string }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="font-serif text-[32px] leading-tight font-extrabold sm:text-[40px]">{title}</h2>{sub && <p className="mt-1.5 max-w-[620px] text-[16px] font-medium text-ink-soft">{sub}</p>}</div>
      {to && <Link to={to} className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-extrabold text-rose-deep hover:underline">{cta} <ArrowRightOutlined aria-hidden /></Link>}
    </div>
  );
}
const Section = ({ children, tone = "cream", label }: { children: ReactNode; tone?: "cream" | "white"; label: string }) => (
  <section aria-label={label} className={tone === "white" ? "bg-white" : "bg-cream"}><div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">{children}</div></section>
);

/** Phần dưới trang chủ: điểm khác biệt, hoa nổi bật, câu chuyện, cách đặt hoa, bài viết, lời mời */
export function HomeSections() {
  const { region } = useRegion();
  const { has: hasCards } = useCardTypes();
  const shop = useShopInfo();
  const [products, setProducts] = useState<ProductCardData[] | null>(null);
  const [posts, setPosts] = useState<PostCard[] | null>(null);

  useEffect(() => {
    let alive = true;
    const p = new URLSearchParams({ limit: "4", sort: "rating", type: "FLOWER" }); if (region) p.set("wardId", String(region.wardId));
    api<{ data: ProductCardData[] }>(`/products?${p}`).then((r) => alive && setProducts(r.data)).catch(() => alive && setProducts([]));
    return () => { alive = false; };
  }, [region?.wardId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { let alive = true; api<{ data: PostCard[] }>("/posts?limit=3").then((r) => alive && setPosts(r.data)).catch(() => alive && setPosts([])); return () => { alive = false; }; }, []);

  const perks = [
    { icon: <CameraOutlined />, t: "Xem ảnh hoa thật trước khi giao", d: "Shop chụp bó hoa vừa cắm xong, bạn xác nhận hoặc yêu cầu chỉnh rồi mới giao." },
    { icon: <EnvironmentOutlined />, t: "Giao đúng nơi, phí rõ ràng", d: "Chọn tỉnh và phường nhận hoa, phí giao hiện ngay trước khi đặt, thanh toán khi nhận hoa." },
    ...(hasCards ? [{ icon: <MailOutlined />, t: "Thiệp kèm lời nhắn", d: "Chọn mẫu thiệp và viết lời nhắn riêng, thiệp được gửi kèm bó hoa." }] : []),
    { icon: <GiftOutlined />, t: "Vườn điểm thưởng", d: "Tưới hoa mỗi ngày để tích điểm và đổi mã giảm giá cho đơn tiếp theo." },
  ];
  const steps = [
    { n: 1, t: "Chọn khu vực", d: "Cho shop biết bạn gửi hoa đến đâu để chỉ hiện những mẫu giao tới nơi." },
    { n: 2, t: "Chọn hoa và thiệp", d: "Xem mẫu theo dịp, người nhận, loại hoa; thêm thiệp nếu muốn." },
    { n: 3, t: "Xác nhận ảnh hoa", d: "Nhận ảnh bó hoa thực tế, duyệt hoặc yêu cầu chỉnh trước khi giao." },
    { n: 4, t: "Nhận hoa, trả tiền khi nhận", d: "Hoa được giao tận nơi, thanh toán khi bạn nhận." },
  ];

  return (
    <>
      <Section label="Vì sao chọn chúng tôi" tone="white">
        <Head title="Vì sao chọn Florea" sub="Mua hoa nên yên tâm: thấy trước, giao đúng, rõ giá." />
        <ul className={`grid gap-4 sm:grid-cols-2 ${perks.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {perks.map((x) => (
            <li key={x.t} className="rounded-3xl border border-line bg-cream p-5">
              <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-rose-soft text-[20px] text-rose-deep">{x.icon}</span>
              <h3 className="mt-4 text-[18px] leading-snug font-extrabold">{x.t}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed font-medium text-ink-soft">{x.d}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Hoa nổi bật">
        <Head title="Hoa được yêu thích" sub={region ? `Các mẫu giao được tới ${region.wardName}, ${region.provinceName}.` : "Chọn khu vực nhận hoa ở đầu trang để chỉ xem mẫu giao tới bạn."} to="/hoa-tuoi" cta="Xem tất cả hoa tươi" />
        {products === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-busy>{[0, 1, 2, 3].map((i) => <div key={i} className="h-[340px] animate-pulse rounded-[28px] bg-white/70" />)}</div>
        ) : products.length === 0 ? (
          <p className="rounded-3xl border border-line bg-white p-8 text-center text-[16px] font-medium text-ink-soft">{region ? "Chưa có mẫu hoa nào giao tới khu vực này." : "Chưa có mẫu hoa nào."} <Link to="/hoa-tuoi" className="font-extrabold text-rose-deep hover:underline">Xem hoa tươi</Link></p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </Section>

      <Section label="Câu chuyện" tone="white">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-[14px] font-extrabold tracking-wide text-rose-deep uppercase"><ShopOutlined aria-hidden /> Câu chuyện của chúng tôi</p>
            <h2 className="font-serif text-[32px] leading-tight font-extrabold sm:text-[40px]">{shop?.shopName ?? "Florea by FloraHub"}</h2>
            <p className="mt-4 text-[17px] leading-[1.8] font-medium text-ink-soft">{shop?.intro || "Hoa tươi từ các florist địa phương, giao tận nơi và gửi ảnh bó hoa thật để bạn xác nhận trước khi giao."}</p>
            <p className="mt-3 text-[17px] leading-[1.8] font-medium text-ink-soft">Mỗi bó hoa đều do người thật chọn, cắm và chụp ảnh. Chúng tôi muốn việc gửi hoa là một niềm vui trọn vẹn, từ lúc chọn mẫu cho đến khi người nhận mở cửa.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/hoa-tuoi" className="btn bg-[#d96b87] text-white hover:bg-[#c45672]"><span>Xem hoa tươi</span></Link>
              <Link to="/goc-cua-florea" className="btn border border-line bg-white text-ink hover:border-rose"><span>Đọc góc của Florea</span></Link>
            </div>
          </div>
          <ol className="grid gap-3" aria-label="Cách đặt hoa">
            {steps.map((s) => (
              <li key={s.n} className="flex items-start gap-4 rounded-3xl border border-line bg-cream p-5">
                <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-deep text-[16px] font-extrabold text-white">{s.n}</span>
                <div><h3 className="text-[18px] leading-snug font-extrabold">{s.t}</h3><p className="mt-1 text-[15px] leading-relaxed font-medium text-ink-soft">{s.d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {posts && posts.length > 0 && (
        <Section label="Bài viết mới">
          <Head title="Góc của Florea" sub="Mẹo chăm hoa, ý nghĩa các loài hoa và cảm hứng trang trí." to="/goc-cua-florea" cta="Xem tất cả bài viết" />
          <div className="grid gap-5 md:grid-cols-3">{posts.map((p) => <PostTile key={p.id} p={p} />)}</div>
        </Section>
      )}

      <section aria-label="Bắt đầu chọn hoa" className="bg-(--ft-bg) text-(--ft-fg)">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-5 px-4 py-12 sm:px-6">
          <div><h2 className="font-serif text-[28px] leading-tight font-extrabold sm:text-[34px]">Sẵn sàng gửi một bó hoa?</h2><p className="mt-1.5 flex items-center gap-2 text-[16px] font-medium text-(--ft-soft)"><CheckCircleOutlined aria-hidden /> Xem ảnh thật, trả tiền khi nhận hoa.</p></div>
          <Link to="/hoa-tuoi" className="btn bg-[#d96b87] px-8 py-4 text-[16px] text-white hover:bg-[#c45672]"><span>Chọn hoa ngay</span></Link>
        </div>
      </section>
    </>
  );
}
