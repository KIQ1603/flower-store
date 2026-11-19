import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BloomMark, Icon } from "./Icons";
import { formatPrice, FREE_SHIPPING_THRESHOLD, products } from "../data";
import { cn } from "../utils/cn";

export type CartTab = "cart" | "wishlist";

type CartDrawerProps = {
  open: boolean;
  tab: CartTab;
  onTabChange: (tab: CartTab) => void;
  onClose: () => void;
  cart: Record<number, number>;
  wishlist: number[];
  onQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onToggleWish: (id: number) => void;
  onAdd: (id: number) => void;
  onClearCart: () => void;
  notify: (message: string) => void;
};

export function CartDrawer({
  open,
  tab,
  onTabChange,
  onClose,
  cart,
  wishlist,
  onQty,
  onRemove,
  onToggleWish,
  onAdd,
  onClearCart,
  notify,
}: CartDrawerProps) {
  const [step, setStep] = useState<"bag" | "checkout" | "done">("bag");
  const [orderCode, setOrderCode] = useState("");
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [payment, setPayment] = useState<"cod" | "transfer">("cod");
  const [cardMessage, setCardMessage] = useState("");

  const cartItems = useMemo(
    () =>
      products
        .filter((product) => (cart[product.id] ?? 0) > 0)
        .map((product) => ({ ...product, qty: cart[product.id] ?? 1 })),
    [cart]
  );
  const wishItems = products.filter((product) => wishlist.includes(product.id));
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const suggestions = products.filter((product) => !cart[product.id]).slice(0, 1);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => {
        setStep("bag");
        setCardMessage("");
      }, 450);
      return () => window.clearTimeout(timer);
    }
    setStep("bag");
  }, [open]);

  const goBrowse = () => {
    onClose();
    window.setTimeout(() => document.getElementById("bo-suu-tap")?.scrollIntoView({ behavior: "smooth" }), 180);
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmedTotal(subtotal);
    setOrderCode(`MM-${Math.floor(1400 + Math.random() * 800)}`);
    onClearCart();
    setStep("done");
    notify("Đơn hoa đã được ghi lại. Mộc sẽ gọi xác nhận trong 15 phút.");
  };

  const addAllWishlist = () => {
    wishItems.forEach((product) => onAdd(product.id));
    onTabChange("cart");
  };

  return (
    <div className={cn("fixed inset-0 z-[90]", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <button
        type="button"
        aria-label="Đóng giỏ hoa"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className={cn(
          "absolute inset-0 h-full w-full cursor-default bg-[#2b322a]/45 backdrop-blur-[3px] transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Giỏ hoa của bạn"
        inert={!open}
        className={cn(
          "absolute top-0 right-0 flex h-full w-full max-w-[460px] flex-col bg-cream shadow-[-30px_0_80px_-30px_rgba(33,40,32,0.45)] transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* header */}
        <div className="relative border-b border-line bg-paper px-5 pt-5 pb-0 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[8px] font-medium tracking-[0.24em] text-ink-faint uppercase">
                <BloomMark className="h-3 w-3 text-rose-deep" />
                Mây &amp; Mộc
              </p>
              <h2 className="mt-1.5 font-serif text-[27px] leading-none text-ink">
                {step === "checkout" ? "Giao hoa đến ai?" : step === "done" ? "Cảm ơn bạn" : "Giỏ hoa của bạn"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          {step === "bag" ? (
            <div className="mt-4 flex items-end gap-6">
              {(
                [
                  { id: "cart" as const, label: "Trong giỏ", count: cartCount },
                  { id: "wishlist" as const, label: "Đã lưu", count: wishlist.length },
                ]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 pb-3 text-[10px] font-medium tracking-[0.12em] uppercase transition-colors",
                    tab === item.id ? "text-ink" : "text-ink-faint hover:text-ink-soft"
                  )}
                >
                  {item.label}
                  <span className="text-[9px] text-ink-faint">({item.count})</span>
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-rose-deep transition-opacity duration-300",
                      tab === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              ))}
            </div>
          ) : step === "checkout" ? (
            <button
              type="button"
              onClick={() => setStep("bag")}
              className="mt-4 flex items-center gap-1.5 pb-3 text-[10px] tracking-[0.1em] text-ink-soft uppercase transition-colors hover:text-rose-deep"
            >
              <Icon name="arrowRight" size={13} className="rotate-180" />
              Quay lại giỏ hoa
            </button>
          ) : (
            <div className="h-4" />
          )}
        </div>

        {/* body */}
        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
          {step === "bag" && tab === "cart" && (
            <div className="px-5 py-5 sm:px-7">
              {cartItems.length > 0 ? (
                <>
                  <div className="mb-5 rounded-xl border border-line/80 bg-paper p-3.5">
                    <p className="flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-soft">
                      <Icon
                        name={remaining === 0 ? "check" : "truck"}
                        size={14}
                        className={cn("mt-0.5 shrink-0", remaining === 0 ? "text-sage-deep" : "text-rose-deep")}
                      />
                      {remaining === 0 ? (
                        <span>
                          Bạn được <b className="font-medium text-sage-deep">miễn phí giao hoa</b> nội thành Hà Nội.
                        </span>
                      ) : (
                        <span>
                          Chỉ còn <b className="font-medium text-ink">{formatPrice(remaining)}</b> để được miễn phí giao
                          nội thành.
                        </span>
                      )}
                    </p>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-sage-soft">
                      <div
                        className="h-full rounded-full bg-sage-deep transition-[width] duration-700 ease-out"
                        style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-line/80">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-3.5 py-4 first:pt-0">
                        <img
                          src={item.image}
                          alt={item.alt}
                          className="h-[96px] w-[76px] shrink-0 rounded-[12px] object-cover"
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-serif text-[20px] leading-tight text-ink">{item.name}</p>
                              <p className="mt-0.5 text-[9.5px] leading-snug text-ink-faint">{item.category}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemove(item.id)}
                              aria-label={`Bỏ ${item.name} khỏi giỏ`}
                              className="text-ink-faint transition-colors hover:text-rose-deep"
                            >
                              <Icon name="close" size={14} />
                            </button>
                          </div>
                          <p className="mt-1.5 text-[11.5px] font-medium text-ink">{formatPrice(item.price)}</p>
                          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                            <div className="flex items-center rounded-full border border-line bg-paper">
                              <button
                                type="button"
                                onClick={() => onQty(item.id, -1)}
                                disabled={item.qty <= 1}
                                aria-label="Bớt một bó"
                                className="grid h-7 w-7 place-items-center rounded-full text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
                              >
                                <Icon name="minus" size={12} />
                              </button>
                              <span className="w-5 text-center text-[10.5px] font-medium">{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => onQty(item.id, 1)}
                                aria-label="Thêm một bó"
                                className="grid h-7 w-7 place-items-center rounded-full text-ink-soft transition-colors hover:text-ink"
                              >
                                <Icon name="plus" size={12} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => onToggleWish(item.id)}
                              className="flex items-center gap-1 text-[9px] tracking-[0.05em] text-ink-faint uppercase transition-colors hover:text-rose-deep"
                            >
                              <Icon name="heart" size={11} />
                              Lưu
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {suggestions.length > 0 && (
                    <div className="mt-5 border-t border-line/80 pt-4">
                      <p className="text-[8.5px] font-medium tracking-[0.18em] text-ink-faint uppercase">
                        Có thể bạn cũng thương
                      </p>
                      {suggestions.map((product) => (
                        <div key={product.id} className="mt-2.5 flex items-center gap-3 rounded-xl border border-line/70 bg-paper/70 p-2.5">
                          <img src={product.image} alt={product.alt} className="h-12 w-10 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="font-serif text-[16px] leading-tight text-ink">{product.name}</p>
                            <p className="text-[10px] text-ink-faint">{formatPrice(product.price)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAdd(product.id)}
                            className="flex items-center gap-1 rounded-full bg-sage-soft px-2.5 py-1.5 text-[9px] font-medium text-sage-deep transition-colors hover:bg-sage hover:text-paper"
                          >
                            <Icon name="plus" size={11} />
                            Thêm
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
                  <div className="relative mb-5 grid h-24 w-24 place-items-center rounded-full bg-sage-mist">
                    <span className="absolute inset-0 rounded-full border border-dashed border-sage/60" />
                    <BloomMark className="h-12 w-12 text-sage-deep" />
                  </div>
                  <p className="font-serif text-[24px] text-ink">Giỏ hoa đang chờ một câu chuyện.</p>
                  <p className="mt-2 max-w-[240px] text-[11.5px] leading-relaxed font-light text-ink-soft">
                    Chọn một bó hoa, viết vài lời — phần còn lại để Mộc lo.
                  </p>
                  <button type="button" onClick={goBrowse} className="btn btn-primary mt-6">
                    <span>Chọn một bó hoa</span>
                    <span className="btn-ic">
                      <Icon name="arrowRight" size={13} />
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "bag" && tab === "wishlist" && (
            <div className="px-5 py-5 sm:px-7">
              {wishItems.length > 0 ? (
                <>
                  <p className="mb-4 text-[10.5px] leading-relaxed text-ink-soft">
                    Những bó hoa bạn đã lưu. Chúng mình giữ chúng ở đây, như một góc vườn riêng.
                  </p>
                  <div className="divide-y divide-line/80">
                    {wishItems.map((item) => (
                      <div key={item.id} className="flex gap-3.5 py-4 first:pt-0">
                        <img src={item.image} alt={item.alt} className="h-[88px] w-[70px] shrink-0 rounded-[12px] object-cover" />
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-serif text-[20px] leading-tight text-ink">{item.name}</p>
                              <p className="mt-0.5 text-[10px] text-ink-faint">{item.subtitle}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onToggleWish(item.id)}
                              aria-label={`Bỏ ${item.name} khỏi yêu thích`}
                              className="grid h-7 w-7 place-items-center rounded-full bg-rose-deep/10 text-rose-deep transition-colors hover:bg-rose-deep hover:text-cream"
                            >
                              <Icon name="heart" size={12} filled />
                            </button>
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                            <span className="text-[11.5px] font-medium text-ink">{formatPrice(item.price)}</span>
                            <button
                              type="button"
                              onClick={() => onAdd(item.id)}
                              className="flex items-center gap-1.5 rounded-full bg-sage-deep px-3 py-1.5 text-[9px] font-medium tracking-[0.04em] text-cream transition-colors hover:bg-ink"
                            >
                              <Icon name="bag" size={11} />
                              Thêm vào giỏ
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
                  <div className="mb-5 grid h-24 w-24 place-items-center rounded-full bg-rose-mist">
                    <Icon name="heart" size={34} className="text-rose-deep" />
                  </div>
                  <p className="font-serif text-[24px] text-ink">Chưa có bó hoa nào được lưu.</p>
                  <p className="mt-2 max-w-[240px] text-[11.5px] leading-relaxed font-light text-ink-soft">
                    Chạm vào trái tim trên bó hoa bạn thích — nó sẽ đợi bạn ở đây.
                  </p>
                  <button type="button" onClick={goBrowse} className="btn btn-outline mt-6">
                    <span>Dạo một vòng vườn</span>
                    <span className="btn-ic">
                      <Icon name="arrowRight" size={13} />
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "checkout" && (
            <form id="checkout-form" onSubmit={submitOrder} className="px-5 py-5 sm:px-7">
              <p className="mb-5 rounded-xl border border-line/80 bg-rose-mist/60 p-3.5 text-[10.5px] leading-relaxed text-ink-soft">
                <Icon name="sparkle" size={12} className="mr-1 inline text-rose-deep" />
                Thiệp viết tay và phí giao nội thành đã được tiệm lo. Bạn chỉ cần cho Mộc biết người nhận là ai.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="field-label">Tên người nhận *</span>
                  <input required name="name" className="field" placeholder="Chị Hà My" autoComplete="name" />
                </label>
                <label className="block">
                  <span className="field-label">Số điện thoại *</span>
                  <input required name="phone" type="tel" className="field" placeholder="09xx xxx xxx" autoComplete="tel" />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="field-label">Địa chỉ nhận hoa *</span>
                <textarea required name="address" rows={2} className="field resize-none" placeholder="Số nhà, đường, phường, quận…" />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="field-label">Ngày giao</span>
                  <input name="date" type="date" className="field" min={new Date(Date.now() + 86400000).toISOString().split("T")[0]} defaultValue={new Date(Date.now() + 86400000).toISOString().split("T")[0]} />
                </label>
                <label className="block">
                  <span className="field-label">Khung giờ</span>
                  <select name="time" className="field" defaultValue="Trong 2 giờ">
                    <option>Trong 2 giờ</option>
                    <option>Buổi sáng (8–11h)</option>
                    <option>Buổi chiều (14–17h)</option>
                    <option>Hẹn giờ kín</option>
                  </select>
                </label>
              </div>
              <label className="mt-3 block">
                <span className="field-label">Lời nhắn trên thiệp</span>
                <textarea
                  name="message"
                  rows={3}
                  maxLength={160}
                  value={cardMessage}
                  onChange={(event) => setCardMessage(event.target.value)}
                  className="field resize-none"
                  placeholder="Một lời chưa kịp nói…"
                />
                <span className="mt-1 block text-right text-[9px] text-ink-faint">{cardMessage.length}/160</span>
              </label>

              <fieldset className="mt-4">
                <legend className="field-label">Cách thanh toán</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "cod" as const, label: "Khi nhận hoa", note: "COD · tiện nhất" },
                      { id: "transfer" as const, label: "Chuyển khoản", note: "Gửi trước 2 giờ" },
                    ]
                  ).map((method) => (
                    <label
                      key={method.id}
                      className={cn(
                        "cursor-pointer rounded-xl border p-3 transition-all duration-300",
                        payment === method.id
                          ? "border-sage-deep bg-sage-mist/60"
                          : "border-line bg-paper/60 hover:border-sage/70"
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={payment === method.id}
                        onChange={() => setPayment(method.id)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-ink">
                        <span
                          className={cn(
                            "grid h-3.5 w-3.5 place-items-center rounded-full border",
                            payment === method.id ? "border-sage-deep bg-sage-deep text-cream" : "border-line"
                          )}
                        >
                          {payment === method.id && <Icon name="check" size={8} strokeWidth={2.4} />}
                        </span>
                        {method.label}
                      </span>
                      <span className="mt-1 block pl-5 text-[9px] text-ink-faint">{method.note}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-5 rounded-xl border border-line/80 bg-paper p-3.5">
                <div className="flex items-center justify-between text-[10.5px] text-ink-soft">
                  <span>{cartCount} bó hoa</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-ink-soft">
                  <span>Giao nội thành Hà Nội</span>
                  <span className="text-sage-deep">{remaining === 0 ? "Miễn phí" : formatPrice(40000)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                  <span className="text-[11px] font-medium text-ink">Tổng cộng</span>
                  <span className="font-serif text-[21px] text-rose-deep">
                    {formatPrice(subtotal + (remaining === 0 ? 0 : 40000))}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-center text-[9px] leading-relaxed text-ink-faint">
                Mộc sẽ gọi xác nhận trong 15 phút. Chưa cần thanh toán ngay.
              </p>
            </form>
          )}

          {step === "done" && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-8 text-center">
              <div className="chibi-sway relative mb-5 grid h-24 w-24 place-items-center rounded-full bg-sage-mist">
                <span className="absolute inset-1 rounded-full border border-dashed border-sage/70" />
                <BloomMark className="h-12 w-12 text-sage-deep" />
              </div>
              <p className="eyebrow justify-center !text-[8.5px]">
                <span className="h-px w-5 bg-rose-deep/50" />
                Đã ghi lại
              </p>
              <h3 className="display mt-3 text-[30px] leading-tight text-ink">
                Đơn hoa đã được <span className="italic text-rose-deep">ghép lại</span>.
              </h3>
              <p className="mt-3 max-w-[290px] text-[11.5px] leading-[1.85] font-light text-ink-soft">
                Cảm ơn bạn đã tin Mộc. Tiệm sẽ gọi xác nhận trong 15 phút và cẩn thận chọn từng cành hoa tươi nhất cho
                ngày hôm ấy.
              </p>
              <div className="mt-6 w-full max-w-[280px] rounded-xl border border-line bg-paper p-4 text-left">
                <div className="flex items-center justify-between text-[10px] text-ink-faint">
                  <span>Mã đơn hoa</span>
                  <span className="font-medium tracking-[0.1em] text-ink">{orderCode}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-ink-faint">
                  <span>Tạm tính</span>
                  <span className="text-ink">{formatPrice(confirmedTotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-ink-faint">
                  <span>Dự kiến giao</span>
                  <span className="text-ink">Trong 2 giờ</span>
                </div>
              </div>
              <p className="hand mt-5 rotate-[-2deg] text-[21px] text-sage-deep">hẹn một ngày thật nhiều hoa.</p>
              <button type="button" onClick={onClose} className="btn btn-primary mt-6">
                <span>Về lại khu vườn</span>
                <span className="btn-ic">
                  <Icon name="arrowRight" size={13} />
                </span>
              </button>
            </div>
          )}
        </div>

        {/* sticky footer */}
        {step === "bag" && tab === "cart" && cartItems.length > 0 && (
          <div className="border-t border-line bg-paper px-5 pt-4 pb-5 sm:px-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] tracking-[0.14em] text-ink-faint uppercase">Tạm tính · {cartCount} bó</p>
                <p className="mt-1 font-serif text-[27px] leading-none text-ink">{formatPrice(subtotal)}</p>
              </div>
              <span className="flex items-center gap-1.5 text-[9px] text-ink-faint">
                <Icon name="mail" size={12} className="text-sage-deep" />
                Thiệp viết tay tặng kèm
              </span>
            </div>
            <button type="button" onClick={() => setStep("checkout")} className="btn btn-primary mt-4 w-full justify-between">
              <span>Tiến hành thanh toán</span>
              <span className="btn-ic">
                <Icon name="arrowUpRight" size={14} />
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full py-1.5 text-center text-[9.5px] tracking-[0.08em] text-ink-soft uppercase transition-colors hover:text-ink"
            >
              Tiếp tục chọn hoa
            </button>
          </div>
        )}

        {step === "bag" && tab === "wishlist" && wishItems.length > 0 && (
          <div className="border-t border-line bg-paper px-5 pt-4 pb-5 sm:px-7">
            <button type="button" onClick={addAllWishlist} className="btn btn-primary w-full justify-between">
              <span>Thêm tất cả vào giỏ hoa</span>
              <span className="btn-ic">
                <Icon name="bag" size={13} />
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full py-1.5 text-center text-[9.5px] tracking-[0.08em] text-ink-soft uppercase transition-colors hover:text-ink"
            >
              Để mình nghĩ thêm
            </button>
          </div>
        )}

        {step === "checkout" && (
          <div className="border-t border-line bg-paper px-5 pt-4 pb-5 sm:px-7">
            <button type="submit" form="checkout-form" className="btn btn-primary w-full justify-between">
              <span>Hoàn tất đặt hoa</span>
              <span className="btn-ic">
                <Icon name="arrowUpRight" size={14} />
              </span>
            </button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[9px] text-ink-faint">
              <Icon name="shield" size={11} className="text-sage-deep" />
              Thông tin của bạn được giữ kín, chỉ Mộc đọc.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
