import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CameraOutlined, CarOutlined, GiftOutlined, HeartOutlined, LinkOutlined, SafetyCertificateOutlined, StarOutlined, TeamOutlined } from "@ant-design/icons";
import { BloomMark } from "../../components/Icons";
import { useAbout } from "../about";
import { Lightbox } from "../previewKit";
import { resized } from "../imgSrc";
import { cn } from "../../utils/cn";

export const ABOUT_ICON: Record<string, ReactNode> = {
  heart: <HeartOutlined />, camera: <CameraOutlined />, gift: <GiftOutlined />, truck: <CarOutlined />, leaf: <BloomMark className="h-[1em] w-[1em]" strokeWidth={1.8} />,
  star: <StarOutlined />, shield: <SafetyCertificateOutlined />, team: <TeamOutlined />,
};

const BLOCK_COLS = ["", "sm:grid-cols-1 sm:max-w-[560px]", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-2 lg:grid-cols-4"];
const STAT_COLS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-2 lg:grid-cols-3", "grid-cols-2 lg:grid-cols-4", "grid-cols-2 lg:grid-cols-5", "grid-cols-2 lg:grid-cols-6"];

function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return null;
  return <img src={resized(src, 900)} alt={alt} loading="lazy" decoding="async" onError={() => setBad(true)} className={cn("object-cover", className)} />;
}
const initials = (n: string) => n.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase()).join("");

/** Trang "Về chúng tôi": mọi nội dung (tiêu đề, câu chuyện, giá trị, con số, thành viên, ảnh) do admin cấu hình; khối nào trống thì ẩn */
export function AboutPage() {
  const a = useAbout();
  const [lb, setLb] = useState<number | null>(null);
  const [blb, setBlb] = useState<{ imgs: string[]; i: number } | null>(null);
  useEffect(() => { document.title = a?.heroTitle ? `${a.heroTitle} · Florea` : "Florea"; return () => { document.title = "Florea"; }; }, [a?.heroTitle]);

  if (!a) return <main className="mx-auto w-full max-w-[1100px] px-4 pt-32 pb-24"><div className="h-72 animate-pulse rounded-[32px] bg-white/70" /></main>;
  if (!a.enabled) return (
    <main className="mx-auto grid w-full max-w-[640px] place-items-center px-4 pt-40 pb-24 text-center">
      <div><h1 className="font-serif text-[34px] font-extrabold">Trang đang được cập nhật</h1><p className="mt-2 text-ink-soft">Bạn quay lại sau nhé.</p><Link to="/" className="btn mt-6 bg-[#d96b87] text-white"><span>Về trang chủ</span></Link></div>
    </main>
  );
  const paras = a.storyBody.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const hasStory = !!(a.storyTitle || paras.length);

  return (
    <main className="w-full">
      {/* Đầu trang */}
      <section aria-label="Giới thiệu" className="bg-gradient-to-b from-rose-mist to-cream">
        <div className={cn("mx-auto grid w-full max-w-[1200px] items-center gap-8 px-4 pt-32 pb-14 sm:px-6 lg:pt-40", a.heroImage && "lg:grid-cols-2 lg:gap-14")}>
          <div>
            <h1 className="font-serif text-[40px] leading-[1.05] font-extrabold sm:text-[56px]">{a.heroTitle}</h1>
            {a.heroSubtitle && <p className="mt-4 max-w-[560px] text-[18px] leading-[1.75] font-medium text-ink-soft">{a.heroSubtitle}</p>}
            <div className="mt-7 flex flex-wrap gap-3"><Link to="/hoa-tuoi" className="btn bg-[#d96b87] text-white hover:bg-[#c45672]"><span>Xem hoa tươi</span></Link><Link to="/goc-cua-florea" className="btn border border-line bg-white text-ink hover:border-rose"><span>Góc của Florea</span></Link></div>
          </div>
          {a.heroImage && <Photo src={a.heroImage} alt="" className="aspect-[4/3] w-full rounded-[32px] shadow-[0_30px_70px_-40px_rgba(60,40,60,0.55)]" />}
        </div>
      </section>

      {/* Con số */}
      {a.stats.length > 0 && (
        <section aria-label="Con số nổi bật" className="bg-white"><dl className={cn("mx-auto grid w-full max-w-[1200px] gap-4 px-4 py-10 sm:px-6", STAT_COLS[Math.min(a.stats.length, 6)])}>
          {a.stats.map((s) => <div key={s.label} className="rounded-3xl border border-line bg-cream p-5 text-center"><dd className="font-serif text-[36px] leading-none font-extrabold text-rose-deep">{s.value}</dd><dt className="mt-2 text-[15px] font-semibold text-ink-soft">{s.label}</dt></div>)}
        </dl></section>
      )}

      {/* Câu chuyện */}
      {hasStory && (
        <section aria-label="Câu chuyện" className="bg-cream"><div className={cn("mx-auto grid w-full max-w-[1200px] items-center gap-8 px-4 py-14 sm:px-6 sm:py-20", a.storyImage && "lg:grid-cols-2 lg:gap-14")}>
          {a.storyImage && <Photo src={a.storyImage} alt="" className="order-2 aspect-[5/4] w-full rounded-[32px] lg:order-1" />}
          <div className="order-1 lg:order-2">
            {a.storyTitle && <h2 className="font-serif text-[32px] leading-tight font-extrabold sm:text-[40px]">{a.storyTitle}</h2>}
            <div className="mt-4 grid gap-4 text-[17px] leading-[1.85] font-medium text-ink-soft">{paras.map((p, i) => <p key={i}>{p}</p>)}</div>
          </div>
        </div></section>
      )}

      {/* Giá trị */}
      {a.values.length > 0 && (
        <section aria-label="Giá trị của chúng tôi" className="bg-white"><div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="mb-7 font-serif text-[32px] font-extrabold sm:text-[40px]">Điều chúng tôi tin</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {a.values.map((v) => (
              <li key={v.title} className="rounded-3xl border border-line bg-cream p-6">
                <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-rose-soft text-[22px] text-rose-deep">{ABOUT_ICON[v.icon] ?? ABOUT_ICON.heart}</span>
                <h3 className="mt-4 text-[20px] leading-snug font-extrabold">{v.title}</h3>
                {v.text && <p className="mt-1.5 text-[15.5px] leading-relaxed font-medium text-ink-soft">{v.text}</p>}
              </li>
            ))}
          </ul>
        </div></section>
      )}

      {/* Khối nội dung: tiêu đề, nội dung, rồi một hàng 1-4 ảnh (minh chứng…) */}
      {a.blocks.map((bk, bi) => (
        <section key={bk.title + bi} aria-label={bk.title} className={bi % 2 === 0 ? "bg-white" : "bg-cream"}><div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-center font-serif text-[32px] leading-tight font-extrabold sm:text-[40px]">{bk.title}</h2>
          {bk.body && <div className="mx-auto mt-4 grid max-w-[860px] gap-4 text-center text-[17px] leading-[1.85] font-medium text-ink-soft">{bk.body.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).map((x, i) => <p key={i}>{x}</p>)}</div>}
          {bk.images.length > 0 && (
            <ul className={cn("mx-auto mt-8 grid grid-cols-2 gap-4", BLOCK_COLS[bk.images.length])}>
              {bk.images.map((im, i) => (
                <li key={im.url + i}>
                  <figure>
                    <button type="button" onClick={() => setBlb({ imgs: bk.images.map((x) => x.url), i })} aria-label={im.caption ? `Xem ảnh: ${im.caption}` : `Xem ảnh ${i + 1} của ${bk.title}`} className="block w-full overflow-hidden rounded-3xl border border-line"><Photo src={im.url} alt={im.caption} className="aspect-[4/3] w-full transition duration-300 hover:scale-105" /></button>
                    {im.caption && <figcaption className="mt-2 text-center text-[14.5px] font-semibold text-ink-soft">{im.caption}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </div></section>
      ))}

      {/* Thành viên */}
      {a.team.length > 0 && (
        <section aria-label="Thành viên" className="bg-cream"><div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="mb-7 font-serif text-[32px] font-extrabold sm:text-[40px]">Đội ngũ của chúng tôi</h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {a.team.map((m, i) => (
              <li key={m.name + i} className="overflow-hidden rounded-[28px] border border-line bg-white">
                {m.photo ? <Photo src={m.photo} alt={m.name} className="aspect-square w-full" /> : <div aria-hidden className="grid aspect-square w-full place-items-center bg-gradient-to-br from-rose-soft to-sage-soft font-serif text-[56px] font-extrabold text-rose-deep">{initials(m.name)}</div>}
                <div className="p-5">
                  <h3 className="text-[19px] leading-snug font-extrabold">{m.name}</h3>
                  {m.role && <p className="text-[14.5px] font-bold text-rose-deep">{m.role}</p>}
                  {m.bio && <p className="mt-2 text-[14.5px] leading-relaxed font-medium text-ink-soft">{m.bio}</p>}
                  {m.link && <a href={m.link} target="_blank" rel="noreferrer noopener" aria-label={`Liên kết của ${m.name}`} className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-bold text-ink hover:text-rose-deep"><LinkOutlined aria-hidden /> Xem trang cá nhân</a>}
                </div>
              </li>
            ))}
          </ul>
        </div></section>
      )}

      {/* Thư viện ảnh */}
      {a.gallery.length > 0 && (
        <section aria-label="Hình ảnh" className="bg-white"><div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="mb-7 font-serif text-[32px] font-extrabold sm:text-[40px]">Hình ảnh</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {a.gallery.map((g, i) => <li key={g + i}><button type="button" onClick={() => setLb(i)} aria-label={`Xem ảnh ${i + 1}`} className="block w-full overflow-hidden rounded-2xl"><Photo src={g} alt={`Ảnh ${i + 1}`} className="aspect-square w-full transition duration-300 hover:scale-105" /></button></li>)}
          </ul>
        </div></section>
      )}
      {blb && <Lightbox images={blb.imgs} start={blb.i} onClose={() => setBlb(null)} />}
      {lb !== null && <Lightbox images={a.gallery} start={lb} onClose={() => setLb(null)} />}

      <section aria-label="Bắt đầu chọn hoa" className="bg-(--ft-bg) text-(--ft-fg)"><div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-5 px-4 py-12 sm:px-6">
        <h2 className="font-serif text-[28px] leading-tight font-extrabold sm:text-[34px]">Cùng chọn một bó hoa nhé</h2>
        <Link to="/hoa-tuoi" className="btn bg-[#d96b87] px-8 py-4 text-[16px] text-white hover:bg-[#c45672]"><span>Chọn hoa ngay</span></Link>
      </div></section>
    </main>
  );
}
