import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

export type Region = { wardId: number; wardName: string; provinceId: number; provinceName: string; deliveryFee: number };
type Ctx = { region: Region | null; setRegion: (r: Region | null) => void; pickerOpen: boolean; openPicker: () => void; closePicker: () => void };
const C = createContext<Ctx>(null as never);
export const useRegion = () => useContext(C);
const KEY = "florea-region";

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setState] = useState<Region | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const setRegion = useCallback((r: Region | null) => {
    setState(r);
    try { r ? localStorage.setItem(KEY, JSON.stringify(r)) : localStorage.removeItem(KEY); } catch { /* bỏ qua */ }
  }, []);

  // Kiểm tra lại khu vực đã lưu: admin có thể đã tắt giao hoặc đổi phí
  useEffect(() => {
    if (!region) return;
    api(`/regions/wards/${region.wardId}`)
      .then((w) => setRegion({ wardId: w.id, wardName: w.name, provinceId: w.province.id, provinceName: w.province.name, deliveryFee: w.deliveryFee }))
      .catch((e) => { if (e.status === 404) setRegion(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <C.Provider value={{ region, setRegion, pickerOpen, openPicker: () => setPickerOpen(true), closePicker: () => setPickerOpen(false) }}>
      {children}
    </C.Provider>
  );
}
