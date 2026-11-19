import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Toast } from "../components/Toast";

type Action = { label: string; to: string };
const Ctx = createContext<(msg: string, action?: Action) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; action?: Action } | null>(null);
  const timer = useRef<number | null>(null);
  const nav = useNavigate();
  const notify = useCallback((msg: string, action?: Action) => {
    setT({ msg, action });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setT(null), action ? 5000 : 3200);
  }, []);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  return (
    <Ctx.Provider value={notify}>
      {children}
      <Toast message={t?.msg ?? null} actionLabel={t?.action?.label} onAction={() => { if (t?.action) nav(t.action.to); setT(null); }} />
    </Ctx.Provider>
  );
}
