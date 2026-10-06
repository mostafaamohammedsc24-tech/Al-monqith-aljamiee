import { FormEvent, useEffect, useState } from "react";
import "./admin-services.css";

type ServiceRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price_iqd: number;
  duration_label: string;
  features: string[];
  variants: string[];
  delivery: "رقمي" | "حضوري" | "رقمي وحضوري";
  provider: "تنفيذ آلي" | "مقدم خدمة" | "مختص أكاديمي";
  template_group: "تقارير" | "عروض" | "تصاميم" | "سيرة مهنية" | "وثائق" | "تقنية" | null;
  is_active: boolean;
  show_price: boolean;
  sort_order: number;
};

type Props = {
  onBack: () => void;
  onPayments: () => void;
  onDiscounts: () => void;
  onLatex: () => void;
};

const tokenKey = "najda-admin-token";
const emptyForm = { title: "", description: "", category: "", basePrice: "", duration: "", features: "", variants: "", delivery: "رقمي" as ServiceRecord["delivery"], provider: "مقدم خدمة" as ServiceRecord["provider"], templateGroup: "" as string, isActive: false, showPrice: true };
const formatIqd = (amount: number) => new Intl.NumberFormat("ar-IQ").format(amount);

export default function AdminServicesPage({ onBack, onPayments, onDiscounts, onLatex }: Props) {
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey) || "");
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token) void loadServices(token);
  }, [token]);

  async function loadServices(accessToken: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/services", { headers: { Authorization: `Bearer ${accessToken}` } });
      const result = await response.json().catch(() => null) as { services?: ServiceRecord[]; error?: string } | null;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem(tokenKey);
          setToken("");
        }
        throw new Error(result?.error || "تعذر تحميل الخدمات.");
      }
      setServices(result?.services || []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل الخدمات.");
    } finally {
      setLoading(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.get("phone"), password: data.get("password") }),
      });
      const result = await response.json().catch(() => null) as { accessToken?: string; error?: string } | null;
      if (!response.ok || !result?.accessToken) throw new Error(result?.error || "تعذر تسجيل دخول المشرف.");
      sessionStorage.setItem(tokenKey, result.accessToken);
      setToken(result.accessToken);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  function editService(service: ServiceRecord) {
    setEditingId(service.id);
    setForm({
      title: service.title,
      description: service.description,
      category: service.category,
      basePrice: String(service.base_price_iqd),
      duration: service.duration_label,
      features: service.features.join("\n"),
      variants: service.variants.join("\n"),
      delivery: service.delivery,
      provider: service.provider,
      templateGroup: service.template_group || "",
      isActive: service.is_active,
      showPrice: service.show_price,
    });
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setMessage("");
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      base_price_iqd: Number(form.basePrice),
      duration_label: form.duration.trim(),
      icon: "file",
      color: "blue",
      features: form.features.split("\n").map((item) => item.trim()).filter(Boolean),
      variants: form.variants.split("\n").map((item) => item.trim()).filter(Boolean),
      delivery: form.delivery,
      provider: form.provider,
      template_group: form.templateGroup || null,
      is_active: form.isActive,
      show_price: form.showPrice,
    };
    try {
      const response = await fetch(editingId ? `/api/admin/services/${encodeURIComponent(editingId)}` : "/api/admin/services", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as { service?: ServiceRecord; error?: string } | null;
      if (!response.ok || !result?.service) throw new Error(result?.error || "تعذر حفظ الخدمة.");
      setMessage(editingId ? "تم تحديث الخدمة." : "تمت إضافة الخدمة.");
      resetForm();
      await loadServices(token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الخدمة.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="admin-services-login" dir="rtl">
        <button className="admin-services-back" onClick={onBack}>العودة للموقع</button>
        <form onSubmit={login}>
          <span>إدارة الخدمات</span><h1>دخول المشرفين</h1>
          <label>رقم الهاتف<input name="phone" required inputMode="tel" autoComplete="username" /></label>
          <label>كلمة المرور<input name="password" type="password" required autoComplete="current-password" /></label>
          {message && <p className="admin-services-error" role="alert">{message}</p>}
          <button className="admin-services-primary" disabled={loading}>{loading ? "جارٍ التحقق..." : "دخول آمن"}</button>
        </form>
      </main>
    );
  }

  return (
    <div className="admin-services" dir="rtl">
      <header>
        <div><span>المنقذ الجامعي</span><h1>إدارة الخدمات</h1></div>
        <nav aria-label="إدارة المشرف">
          <button onClick={onPayments}>المدفوعات</button><button className="active">الخدمات</button>
          <button onClick={onDiscounts}>الخصومات</button><button onClick={onLatex}>مختبر LaTeX</button>
          <button onClick={onBack}>الموقع</button>
          <button onClick={() => { sessionStorage.removeItem(tokenKey); setToken(""); }}>خروج</button>
        </nav>
      </header>
      <main>
        <section className="admin-services-editor">
          <div><span>{editingId ? "تعديل خدمة منشورة" : "خدمة جديدة"}</span><h2>{editingId ? "تحديث بيانات الخدمة" : "إضافة خدمة"}</h2></div>
          <form onSubmit={saveService}>
            <label><span>اسم الخدمة *</span><input required maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label><span>الفئة *</span><input required maxLength={100} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
            <label><span>السعر بالدينار العراقي *</span><input type="number" min="0" max="2147483647" step="1" required value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })} /></label>
            <label><span>مدة التنفيذ *</span><input required maxLength={150} value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} placeholder="مثال: 3 أيام" /></label>
            <label className="admin-services-wide"><span>الوصف *</span><textarea required maxLength={5000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label><span>طريقة التسليم</span><select value={form.delivery} onChange={(event) => setForm({ ...form, delivery: event.target.value as ServiceRecord["delivery"] })}><option>رقمي</option><option>حضوري</option><option>رقمي وحضوري</option></select></label>
            <label><span>مقدم الخدمة</span><select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value as ServiceRecord["provider"] })}><option>مقدم خدمة</option><option>مختص أكاديمي</option><option>تنفيذ آلي</option></select></label>
            <label><span>مجموعة القوالب</span><select value={form.templateGroup} onChange={(event) => setForm({ ...form, templateGroup: event.target.value })}><option value="">لا توجد</option><option>تقارير</option><option>عروض</option><option>تصاميم</option><option>سيرة مهنية</option><option>وثائق</option><option>تقنية</option></select></label>
            <label><span>المزايا، كل ميزة في سطر</span><textarea rows={3} value={form.features} onChange={(event) => setForm({ ...form, features: event.target.value })} /></label>
            <label><span>الخيارات، كل خيار في سطر</span><textarea rows={3} value={form.variants} onChange={(event) => setForm({ ...form, variants: event.target.value })} /></label>
            <label className="admin-services-toggle"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span>نشر الخدمة للمستخدمين</span></label>
            <label className="admin-services-toggle"><input type="checkbox" checked={form.showPrice} onChange={(event) => setForm({ ...form, showPrice: event.target.checked })} /><span>إظهار السعر</span></label>
            <div className="admin-services-actions"><button className="admin-services-primary" disabled={loading}>{loading ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة الخدمة"}</button>{editingId && <button type="button" onClick={resetForm}>إلغاء التعديل</button>}</div>
          </form>
          {message && <p className={message.startsWith("تم") ? "admin-services-success" : "admin-services-error"} role="status">{message}</p>}
        </section>
        <section className="admin-services-list">
          <div><span>الكتالوج الدائم</span><h2>الخدمات ({services.length})</h2></div>
          {loading && !services.length ? <p>جارٍ تحميل الخدمات...</p> : services.length ? services.map((service) => (
            <article key={service.id}>
              <div><small>{service.category} · {service.is_active ? "منشورة" : "مسودة"}</small><h3>{service.title}</h3><p>{service.description}</p></div>
              <strong>{service.show_price ? `${formatIqd(service.base_price_iqd)} د.ع` : "السعر مخفي"}</strong>
              <button onClick={() => editService(service)}>تعديل</button>
            </article>
          )) : <p className="admin-services-empty">لا توجد خدمات محفوظة بعد. أضف الخدمة الأولى أعلاه.</p>}
        </section>
      </main>
    </div>
  );
}