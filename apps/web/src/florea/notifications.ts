import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export type Notice = { id: string; type: string; title: string; body: string; link: string; code: string; readAt: string | null; createdAt: string };

/** Thông báo của người đang đăng nhập: tự làm mới mỗi 30 giây và khi quay lại tab */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const live = useRef(true);
  const load = useCallback(() => {
    if (!user) return;
    api<{ unread: number; data: Notice[] }>("/notifications?limit=20", {}, true).then((r) => { if (live.current) { setItems(r.data); setUnread(r.unread); } }).catch(() => {});
  }, [user]);
  useEffect(() => {
    live.current = true;
    if (!user) { setItems([]); setUnread(0); return; }
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 30000);
    const vis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", vis);
    return () => { live.current = false; clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [user, load]);

  const markRead = useCallback(async (id: string) => {
    setItems((x) => x.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - (items.find((n) => n.id === id && !n.readAt) ? 1 : 0)));
    await api(`/notifications/${id}/read`, { method: "PATCH" }, true).catch(() => load());
  }, [items, load]);
  const readAll = useCallback(async () => {
    setItems((x) => x.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))); setUnread(0);
    await api("/notifications/read-all", { method: "POST" }, true).catch(() => load());
  }, [load]);
  return { items, unread, markRead, readAll, reload: load };
}

export const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Vừa xong"; if (s < 3600) return `${Math.floor(s / 60)} phút trước`; if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
};
