import { useEffect, useState } from "react";
import { api, money } from "./api";
import { useRegion } from "./region";
import { FSelect } from "./FSelect";
import { cn } from "../utils/cn";

type Province = { id: number; name: string; wardCount: number };
type Ward = { id: number; name: string; deliveryFee: number };

export function RegionPicker({ dark = false, onDone, cta = "Xem mẫu hoa trong khu vực" }: { dark?: boolean; onDone: () => void; cta?: string }) {
  const { region, setRegion } = useRegion();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceId, setProvinceId] = useState<number | "">(region?.provinceId ?? "");
  const [wardId, setWardId] = useState<number | "">(region?.wardId ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Province[]>("/regions/provinces").then(setProvinces).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (provinceId === "") { setWards([]); return; }
    api(`/regions/provinces/${provinceId}/wards`).then((r) => setWards(r.wards)).catch((e) => setError(e.message));
  }, [provinceId]);

  const ward = wards.find((w) => w.id === wardId);
  const submit = () => {
    const p = provinces.find((x) => x.id === provinceId);
    if (!p || !ward) { setError("Vui lòng chọn đủ tỉnh/thành và phường/khu vực"); return; }
    setRegion({ wardId: ward.id, wardName: ward.name, provinceId: p.id, provinceName: p.name, deliveryFee: ward.deliveryFee });
    onDone();
  };

  const label = cn("mb-1 block text-[11.5px] font-semibold tracking-wide", dark ? "text-[#f3ced9]" : "text-ink-soft");

  return (
    <div className="grid gap-3.5">
      <div>
        <label className={label} htmlFor="rg-province">Tỉnh / Thành phố</label>
        <FSelect id="rg-province" dark={dark} ariaLabel="Tỉnh / Thành phố" value={provinceId} disabled={loading} placeholder={loading ? "Đang tải…" : "Chọn tỉnh/thành phố"} options={provinces.map((p) => ({ value: p.id, label: p.name }))}
          onChange={(v) => { setProvinceId(v === "" ? "" : Number(v)); setWardId(""); setError(""); }} />
      </div>
      <div>
        <label className={label} htmlFor="rg-ward">Phường / Khu vực</label>
        <FSelect id="rg-ward" dark={dark} ariaLabel="Phường / Khu vực" value={wardId} disabled={provinceId === ""} placeholder={provinceId === "" ? "Chọn tỉnh/thành trước" : "Chọn phường/khu vực"} options={wards.map((w) => ({ value: w.id, label: w.name }))}
          onChange={(v) => { setWardId(v === "" ? "" : Number(v)); setError(""); }} />
      </div>
      {ward && <p className={cn("text-[12.5px]", dark ? "text-[#f6dfe4]" : "text-ink-soft")}>Phí giao đến {ward.name}: <b>{money(ward.deliveryFee)}</b></p>}
      {error && <p role="alert" className={cn("text-[12.5px]", dark ? "text-[#ffb3c4]" : "text-rose-deep")}>{error}</p>}
      <button type="button" onClick={submit} className="btn bg-[#d96b87] text-white shadow-[0_16px_34px_-12px_rgba(217,107,135,0.75)] hover:bg-[#c45672]">
        <span>{cta}</span>
      </button>
    </div>
  );
}
