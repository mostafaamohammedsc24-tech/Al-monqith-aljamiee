import { FormEvent, useEffect, useState } from "react";
import "./admin-discounts.css";

type DiscountCode = {
  id: string;
  code: string;
  type: "fixed" | "percentage";
  value: number;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
};

const API = import.meta.env.VITE_ADMIN_DISCOUNTS_ENDPOINT || "/api/admin/discounts";

export default function AdminDiscountsPage({ onBack, onLatex }: { onBack: () => void; onLatex: () => void }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("najda-admin-token") || "");
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [type, setType] = useState<DiscountCode["type"]>("percentage");
  const [limitPreset, setLimitPreset] = useState("unlimited");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadDiscounts();
  }, [token]);

  async function request(url = API, options: RequestInit = {}) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers } });
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem("najda-admin-token");
      setToken("");
      throw new Error("انتهت جلسة المشرف.");
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error || "تعذر تنفيذ العملية.");
    }
    return response;
  }

  async function loadDiscounts() {
    setLoading(true);
    try {
      const response = await request();
      const data = await response.json() as { discounts?: DiscountCode[] } | DiscountCode[];
      setDiscounts(Array.isArray(data) ? data : data.discounts || []);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر تحميل أكواد الخصم.");
    } finally {
      setLoading(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(import.meta.env.VITE_ADMIN_LOGIN_ENDPOINT || "/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: data.get("phone"), password: data.get("password") }) });
      if (!response.ok) throw new Error("بيانات الدخول غير صحيحة أو الخادم غير متصل.");
      const result = await response.json() as { accessToken?: string };
      if (!result.accessToken) throw new Error("لم يُرجع الخادم جلسة صالحة.");
      sessionStorage.setItem("najda-admin-token", result.accessToken);
      setToken(result.accessToken);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  async function createDiscount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = Number(data.get("value"));
    if (type === "percentage" && (value < 1 || value > 100)) {
      setStatus("النسبة يجب أن تكون بين 1% و100%.");
      return;
    }
    const usageLimit = limitPreset === "unlimited" ? null : Number(limitPreset === "custom" ? data.get("customLimit") : limitPreset);
    setLoading(true);
    try {
      const response = await request(API, {
        method: "POST",
        body: JSON.stringify({
          code: String(data.get("code")).trim().toUpperCase(),
          type,
          value,
          usageLimit,
          startsAt: data.get("startsAt") || null,
          expiresAt: data.get("expiresAt") || null,
          isActive: true,
        }),
      });
      const created = await response.json() as DiscountCode;
      setDiscounts((current) => [created, ...current]);
      setStatus("تم إنشاء كود الخصم بنجاح.");
      form.reset();
      setType("percentage");
      setLimitPreset("unlimited");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر إنشاء الكود.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleDiscount(discount: DiscountCode) {
    try {
      await request(`${API}/${discount.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !discount.isActive }) });
      setDiscounts((current) => current.map((item) => item.id === discount.id ? { ...item, isActive: !item.isActive } : item));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر تعديل الكود.");
    }
  }

  async function deleteDiscount(discount: DiscountCode) {
    if (!window.confirm(`حذف الكود ${discount.code}؟`)) return;
    try {
      await request(`${API}/${discount.id}`, { method: "DELETE" });
      setDiscounts((current) => current.filter((item) => item.id !== discount.id));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حذف الكود.");
    }
  }

  if (!token) return <div className="discount-admin-login" dir="rtl"><button onClick={onBack}>العودة للموقع</button><form onSubmit={login}><span>%</span><p>لوحة مشرفي المنقذ الجامعي</p><h1>إدارة أكواد الخصم</h1><label>رقم الهاتف<input name="phone" required inputMode="tel" placeholder="07XX XXX XXXX" /></label><label>رمز الدخول<input name="password" required type="password" placeholder="••••••••" /></label>{status && <div>{status}</div>}<button disabled={loading} type="submit">{loading ? "جارٍ التحقق..." : "دخول المشرف"}</button><small>المصادقة تتم على الخادم، ولا توجد بيانات دخول داخل كود الواجهة.</small></form></div>;

  return (
    <div className="discount-admin" dir="rtl">
      <aside>
        <div className="discount-admin-brand"><span>%</span><div><b>المنقذ الجامعي</b><small>لوحة الإدارة</small></div></div>
        <nav><button className="active">أكواد الخصم</button><button onClick={onLatex}>مختبر LaTeX</button><button onClick={onBack}>العودة للموقع</button></nav>
        <button className="discount-logout" onClick={() => { sessionStorage.removeItem("najda-admin-token"); setToken(""); }}>تسجيل الخروج</button>
      </aside>
      <main>
        <header><div><span>التسويق والعروض</span><h1>أكواد الخصم</h1><p>أنشئ أكوادًا محدودة أو غير محدودة وراقب استخدامها.</p></div><div className="discount-summary"><span><small>الأكواد</small><b>{discounts.length}</b></span><span><small>النشطة</small><b>{discounts.filter((item) => item.isActive).length}</b></span><span><small>الاستخدامات</small><b>{discounts.reduce((sum, item) => sum + item.usedCount, 0)}</b></span></div></header>
        <div className="discount-admin-grid">
          <section className="discount-create">
            <div className="discount-section-title"><span>كود جديد</span><h2>إنشاء خصم</h2></div>
            <form onSubmit={createDiscount}>
              <label><span>رمز الخصم</span><input name="code" required pattern="[A-Za-z0-9_-]{3,24}" placeholder="مثال: STUDENT25" onInput={(event) => event.currentTarget.value = event.currentTarget.value.toUpperCase()} /></label>
              <fieldset><legend>نوع الخصم</legend><div className="discount-type-options"><label><input checked={type === "percentage"} onChange={() => setType("percentage")} type="radio" /><span><b>خصم نسبة</b><small>مثل 25% أو 50%</small></span></label><label><input checked={type === "fixed"} onChange={() => setType("fixed")} type="radio" /><span><b>مبلغ ثابت</b><small>مثل 3,000 د.ع</small></span></label></div></fieldset>
              <label><span>{type === "percentage" ? "نسبة الخصم %" : "المبلغ بالدينار"}</span><input name="value" required min="1" max={type === "percentage" ? 100 : undefined} type="number" placeholder={type === "percentage" ? "25" : "3000"} /></label>
              {type === "percentage" && <div className="quick-percent">{[25, 50, 75, 100].map((value) => <button key={value} type="button" onClick={(event) => { const input = event.currentTarget.closest("form")?.elements.namedItem("value") as HTMLInputElement; if (input) input.value = String(value); }}>{value}%</button>)}</div>}
              <fieldset><legend>عدد مرات الاستخدام</legend><div className="usage-presets">{[["1", "مرة"], ["2", "مرتان"], ["100", "100 مرة"], ["unlimited", "غير محدود"], ["custom", "مخصص"]].map(([value, label]) => <label key={value}><input checked={limitPreset === value} onChange={() => setLimitPreset(value)} type="radio" /><span>{label}</span></label>)}</div></fieldset>
              {limitPreset === "custom" && <label><span>الحد المخصص</span><input name="customLimit" min="1" required type="number" /></label>}
              <div className="discount-dates"><label><span>يبدأ في</span><input name="startsAt" type="datetime-local" /></label><label><span>ينتهي في</span><input name="expiresAt" type="datetime-local" /></label></div>
              <button className="create-discount-button" disabled={loading} type="submit">{loading ? "جارٍ الحفظ..." : "إنشاء كود الخصم"}</button>
            </form>
          </section>
          <section className="discount-list">
            <div className="discount-section-title"><span>الإدارة والمتابعة</span><h2>الأكواد الحالية</h2></div>
            {status && <div className="discount-status">{status}</div>}
            {loading && !discounts.length ? <div className="discount-empty">جارٍ تحميل الأكواد...</div> : discounts.length ? discounts.map((discount) => {
              const usagePercent = discount.usageLimit ? Math.min(100, discount.usedCount / discount.usageLimit * 100) : 0;
              return <article className={!discount.isActive ? "disabled" : ""} key={discount.id}><div className="discount-code"><span>{discount.type === "percentage" ? "%" : "د.ع"}</span><div><b>{discount.code}</b><small>{discount.type === "percentage" ? `${discount.value}%` : `${new Intl.NumberFormat("ar-IQ").format(discount.value)} د.ع`} خصم</small></div></div><div className="discount-usage"><span><small>الاستخدام</small><b>{discount.usedCount} / {discount.usageLimit ?? "∞"}</b></span><i><em style={{ width: `${usagePercent}%` }} /></i></div><div className="discount-actions"><button onClick={() => toggleDiscount(discount)}>{discount.isActive ? "تعطيل" : "تفعيل"}</button><button className="delete" onClick={() => deleteDiscount(discount)}>حذف</button></div></article>;
            }) : <div className="discount-empty"><span>%</span><h3>لا توجد أكواد بعد</h3><p>أنشئ أول كود من النموذج المجاور.</p></div>}
          </section>
        </div>
      </main>
    </div>
  );
}
