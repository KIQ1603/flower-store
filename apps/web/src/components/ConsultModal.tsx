import { useEffect, useState, type FormEvent } from "react";
import { BloomMark, Icon } from "./Icons";
import { ChibiGift, ChibiWatering, Squiggle } from "./Illustrations";
import { cn } from "../utils/cn";

type ConsultModalProps = {
  open: boolean;
  onClose: () => void;
  notify: (message: string) => void;
};

const budgets = ["350 – 500k", "500 – 800k", "800k – 1.2tr", "Mộc tự chọn"];

export function ConsultModal({ open, onClose, notify }: ConsultModalProps) {
  const [sent, setSent] = useState(false);
  const [budget, setBudget] = useState(budgets[1]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [occasion, setOccasion] = useState("Tình yêu");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => setSent(false), 400);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    notify("Mộc đã nhận được câu chuyện của bạn. Hẹn gặp trong 15 phút.");
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[95] flex items-end justify-center transition-opacity duration-400 sm:items-center sm:p-6",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        aria-label="Đóng tư vấn"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className="absolute inset-0 h-full w-full cursor-default bg-[#2b322a]/50 backdrop-blur-[4px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consult-title"
        className={cn(
          "relative max-h-[92vh] w-full max-w-[880px] overflow-y-auto overscroll-contain rounded-t-[28px] border border-line bg-cream shadow-[0_60px_120px_-40px_rgba(25,32,24,0.6)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:rounded-[28px]",
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-[0.98] opacity-0"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 z-20 grid h-9 w-9 place-items-center rounded-full border border-line bg-paper/90 text-ink-soft backdrop-blur-sm transition-colors hover:border-ink hover:text-ink"
        >
          <Icon name="close" size={16} />
        </button>

        <div className="grid sm:grid-cols-[0.82fr_1.18fr]">
          {/* left atmosphere */}
          <div className="relative hidden overflow-hidden bg-sage-mist p-6 sm:flex sm:flex-col sm:justify-between lg:p-7">
            <div aria-hidden="true" className="absolute inset-0">
              <div className="absolute -top-16 -left-10 h-52 w-52 rounded-full bg-sage-soft/70 blur-[40px]" />
              <div className="absolute -right-16 bottom-10 h-56 w-56 rounded-full bg-rose-soft/60 blur-[50px]" />
              <span className="absolute inset-x-5 top-5 bottom-5 rounded-[24px] border border-dashed border-sage/50" />
            </div>
            <div className="relative">
              <p className="flex items-center gap-2 text-[8px] font-medium tracking-[0.24em] text-sage-deep uppercase">
                <BloomMark className="h-4 w-4" />
                Mây &amp; Mộc atelier
              </p>
              <h3 className="mt-4 font-serif text-[28px] leading-[1.12] text-ink">
                Một câu chuyện,
                <br />
                <span className="italic text-rose-deep">một bó hoa vừa vặn.</span>
              </h3>
              <Squiggle className="mt-1 h-2.5 w-28 text-rose/70" />
            </div>

            <ChibiWatering className="chibi-sway relative mx-auto my-4 w-[210px] max-w-full" />

            <div className="relative">
              <p className="font-serif text-[16px] leading-relaxed text-ink/80 italic">
                “Bạn không cần biết tên loài hoa. Bạn chỉ cần biết mình muốn gửi đi điều gì.”
              </p>
              <p className="hand mt-2 text-[20px] text-sage-deep">— Mộc</p>
              <div className="mt-5 space-y-2 border-t border-sage/40 pt-4 text-[10px] text-ink-soft">
                <p className="flex items-center gap-2">
                  <Icon name="clock" size={13} className="text-sage-deep" /> Trả lời trong 15 phút
                </p>
                <p className="flex items-center gap-2">
                  <Icon name="phone" size={13} className="text-sage-deep" /> 0912 345 678 · Zalo
                </p>
              </div>
            </div>
          </div>

          {/* form / success */}
          <div className="relative p-6 pt-14 sm:p-8 sm:pt-10 lg:p-10">
            {sent ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="relative mb-5 grid h-20 w-20 place-items-center rounded-full bg-rose-mist">
                  <span className="absolute inset-1.5 rounded-full border border-dashed border-rose/60" />
                  <BloomMark className="h-9 w-9 text-rose-deep" />
                </div>
                <p className="eyebrow justify-center !text-[8.5px]">
                  <span className="h-px w-5 bg-rose-deep/50" />
                  Đã nhận được
                </p>
                <h3 id="consult-title" className="display mt-3 max-w-[330px] text-[31px] leading-[1.1] text-ink">
                  Mộc đã nhận được <span className="italic text-rose-deep">câu chuyện</span> của bạn.
                </h3>
                <p className="mt-3 max-w-[300px] text-[11.5px] leading-[1.85] font-light text-ink-soft">
                  {name ? `${name.split(" ").slice(-1)[0]} ơi, ` : ""}Mộc sẽ nhắn lại qua Zalo hoặc SMS trong 15 phút
                  trong giờ mở tiệm, kèm 2–3 phương án và khoảng giá để bạn chọn.
                </p>
                <div className="mt-5 w-full max-w-[290px] rounded-xl border border-line bg-paper px-4 py-3 text-left">
                  <p className="flex items-center justify-between text-[10px] text-ink-faint">
                    <span>Dịp tặng</span>
                    <span className="text-ink">{occasion}</span>
                  </p>
                  <p className="mt-2 flex items-center justify-between text-[10px] text-ink-faint">
                    <span>Khoảng ngân sách</span>
                    <span className="text-ink">{budget}</span>
                  </p>
                  {note && <p className="mt-2 line-clamp-2 text-[9.5px] leading-relaxed text-ink-faint">“{note}”</p>}
                </div>
                <ChibiGift className="chibi-sway-soft mt-2 w-[190px]" />
                <button type="button" onClick={onClose} className="btn btn-primary mt-2">
                  <span>Hẹn gặp Mộc</span>
                  <span className="btn-ic">
                    <Icon name="arrowUpRight" size={13} />
                  </span>
                </button>
                <a href="mailto:hello@maymoc.vn" className="mt-3 text-[9.5px] tracking-[0.06em] text-ink-faint uppercase underline underline-offset-4">
                  hoặc viết thư cho tiệm
                </a>
              </div>
            ) : (
              <>
                <p className="eyebrow !text-[8.5px]">
                  <span className="h-px w-5 bg-rose-deep/50" />
                  Đặt hoa riêng · 15 phút
                </p>
                <h2 id="consult-title" className="display mt-3 max-w-[370px] text-[30px] leading-[1.08] text-ink sm:text-[35px]">
                  Kể Mộc nghe về <span className="italic text-rose-deep">món quà</span> của bạn.
                </h2>
                <p className="mt-2.5 max-w-[400px] text-[11px] leading-[1.8] font-light text-ink-soft">
                  Không cần mẫu hoa hay tên loài. Chỉ cần vài điều nhỏ — Mộc sẽ tìm ra bó hoa hợp với câu chuyện ấy.
                </p>

                <form onSubmit={submit} className="mt-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="field-label">Bạn gọi mình là *</span>
                      <input
                        required
                        name="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Hà My"
                        autoComplete="name"
                        className="field"
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">Số điện thoại / Zalo *</span>
                      <input
                        required
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="09xx xxx xxx"
                        autoComplete="tel"
                        className="field"
                      />
                    </label>
                  </div>

                  <label className="mt-3 block">
                    <span className="field-label">Bạn đang muốn gửi hoa nhân dịp</span>
                    <select name="occasion" value={occasion} onChange={(event) => setOccasion(event.target.value)} className="field">
                      {["Tình yêu", "Sinh nhật", "Tặng mẹ", "Cảm ơn", "Hoa cưới", "Tân gia", "Một dịp bình thường"].map(
                        (item) => (
                          <option key={item}>{item}</option>
                        )
                      )}
                    </select>
                  </label>

                  <div className="mt-3">
                    <span className="field-label">Ngân sách dự kiến</span>
                    <div className="flex flex-wrap gap-1.5">
                      {budgets.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setBudget(item)}
                          data-active={budget === item}
                          className="chip !px-3 !py-1.5 !text-[10px]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="mt-3 block">
                    <span className="field-label">Một chút về người nhận (nếu bạn muốn kể)</span>
                    <textarea
                      name="note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={3}
                      maxLength={240}
                      className="field resize-none"
                      placeholder="Mẹ mình thích tông trắng xanh, không thích mùi nồng…"
                    />
                  </label>

                  <button type="submit" className="btn btn-primary mt-4 w-full justify-between">
                    <span>Gửi câu chuyện cho Mộc</span>
                    <span className="btn-ic">
                      <Icon name="arrowUpRight" size={14} />
                    </span>
                  </button>
                  <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[8.5px] text-ink-faint">
                    <Icon name="shield" size={10} className="text-sage-deep" />
                    Chỉ để Mộc liên hệ. Không nhận tin quảng cáo.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
