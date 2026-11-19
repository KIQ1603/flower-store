import { useEffect, useState } from "react";
import { api } from "./api";

export type CardType = { id: number; name: string; price: number; imageUrl: string | null };
let cache: { at: number; data: CardType[] } | null = null;

/** Mẫu thiệp shop đang bán (do admin cấu hình). Không có mẫu nào → `has = false` và web ẩn mọi mục thiệp. */
export function useCardTypes() {
  const [list, setList] = useState<CardType[] | null>(cache?.data ?? null);
  useEffect(() => {
    let alive = true;
    if (cache && Date.now() - cache.at < 30_000) { setList(cache.data); return; }
    api<CardType[]>("/card-types").then((d) => { cache = { at: Date.now(), data: d }; if (alive) setList(d); }).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, []);
  return { list: list ?? [], ready: list !== null, has: (list?.length ?? 0) > 0 };
}
