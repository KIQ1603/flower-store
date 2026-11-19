import { useEffect, useState } from "react";
import { api } from "./api";

export type ShopInfo = { shopName: string; intro: string; address: string; phone: string; email: string; openHours: string; zalo: string; facebook: string; tiktok: string; instagram: string; youtube: string };
let cache: { at: number; data: ShopInfo } | null = null;

/** Thông tin shop do admin cấu hình (chân trang). Chưa tải xong thì trả null để chân trang không nhấp nháy sai nội dung. */
export function useShopInfo() {
  const [info, setInfo] = useState<ShopInfo | null>(cache?.data ?? null);
  useEffect(() => {
    let alive = true;
    if (cache && Date.now() - cache.at < 60_000) { setInfo(cache.data); return; }
    api<ShopInfo>("/shop-info").then((d) => { cache = { at: Date.now(), data: d }; if (alive) setInfo(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return info;
}
