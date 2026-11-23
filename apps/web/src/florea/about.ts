import { useEffect, useState } from "react";
import { api } from "./api";

export type AboutValue = { title: string; text: string; icon: string };
export type AboutStat = { value: string; label: string };
export type AboutMember = { name: string; role: string; bio: string; photo: string; link: string };
export type AboutImage = { url: string; caption: string };
export type AboutBlock = { title: string; body: string; images: AboutImage[] };
export type About = { enabled: boolean; heroTitle: string; heroSubtitle: string; heroImage: string; storyTitle: string; storyBody: string; storyImage: string; values: AboutValue[]; stats: AboutStat[]; blocks: AboutBlock[]; team: AboutMember[]; gallery: string[] };
let cache: { at: number; data: About } | null = null;

/** Nội dung trang Về chúng tôi do admin cấu hình. null = đang tải (để thanh menu không nhấp nháy). */
export function useAbout() {
  const [about, setAbout] = useState<About | null>(cache?.data ?? null);
  useEffect(() => {
    let alive = true;
    if (cache && Date.now() - cache.at < 60_000) { setAbout(cache.data); return; }
    api<About>("/about").then((d) => { cache = { at: Date.now(), data: d }; if (alive) setAbout(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return about;
}
