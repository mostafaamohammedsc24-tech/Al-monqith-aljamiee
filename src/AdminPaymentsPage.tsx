import { FormEvent, useEffect, useState } from "react";
import "./admin-payments.css";

type AdminOrder = {
  id: string;
  order_number: string;
  service_title: string;
  total_iqd: number;
  status: string;
  payment_status: string;
  created_at: string;
  order_type?: "whatsapp_request";
  full_name?: string;
  student_phone?: string;
  university?: string;
  college?: string;
  department?: string;
  supervisor?: string;
  report_title?: string;
  notes?: string;
  variant?: string;
  template?: string;
  preferred_color?: string;
  speed?: string;
};

type Props = {
  onBack: () => void;
  onDashboard: () => void;
  onServices: () => void;
  onDiscounts: () => void;
};

const tokenKey = "najda-admin-token";
const formatIqd = (amount: number) => new Intl.NumberFormat("ar-IQ").format(amount);

export default function AdminPaymentsPage({ onBack, onDashboard, onServices, onDiscounts }: Props) {
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey) || "");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (token) void loadOrders(token);
  }, [token]);

  async function loadOrders(accessToken: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json().catch(() => null) as { orders?: AdminOrder[]; warning?: string; error?: string } | null;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem(tokenKey);
          setToken("");
        }
        throw new Error(result?.error || "تعذر تحميل الطلبات.");
      }
      if (!result) throw new Error("استجابة الخادم غير صالحة.");
      setOrders(result.orders || []);
      setStatus(result.warning || "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر تحميل الطلبات.");
    } finally {
      setLoading(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
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
      onDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmOfflinePayment(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setStatus("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/confirm-offline-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          method: data.get("method"),
          reference: data.get("reference"),
          reason: data.get("reason"),
        }),
      });
      const result = await response.json().catch(() => null) as { error?: string; confirmation?: { receiptNumber?: string } } | null;
      if (!response.ok) throw new Error(result?.error || "تعذر حفظ تأكيد الدفع.");
      setActiveOrder(null);
      setStatus(result?.confirmation?.receiptNumber
        ? `تم تسجيل القبض. رقم الوصل: ${result.confirmation.receiptNumber}`
        : "تم تسجيل القبض وتوثيقه في سجل التدقيق.");
      await loadOrders(token);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حفظ تأكيد الدفع.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="admin-payment-login" dir="rtl">
        <button className="admin-payment-back" onClick={onBack}>العودة للموقع</button>
        <form onSubmit={login}>
          <span className="admin-payment-mark">إدارة</span>
          <p>المنقذ الجامعي</p>
          <h1>دخول المشرفين</h1>
          <label><span>رقم الهاتف</span><input name="phone" required inputMode="tel" autoComplete="username" placeholder="07XX XXX XXXX" /></label>
          <label><span>كلمة المرور</span><input name="password" required type="password" autoComplete="current-password" /></label>
          {status && <div className="admin-payment-message error" role="alert">{status}</div>}
          <button className="admin-payment-primary" type="submit" disabled={loading}>{loading ? "جارٍ التحقق..." : "دخول آمن"}</button>
          <small>يتم التحقق من الحساب ودور المشرف لدى الخادم.</small>
        </form>
      </main>
    );
  }

  return (
    <div className="admin-payments" dir="rtl">
      <header>
        <div><span>المنقذ الجامعي</span><h1>طلبات واتساب المحفوظة</h1><p>قائمة الطلبات المحفوظة على قرص Render الدائم.</p></div>
        <nav aria-label="إدارة المشرف">
          <button className="active" onClick={onDashboard}>المدفوعات</button>
          <button onClick={onServices}>الخدمات</button>
          <button onClick={onDiscounts}>الخصومات</button>
          <button onClick={onBack}>الموقع</button>
          <button onClick={() => { sessionStorage.removeItem(tokenKey); setToken(""); }}>خروج</button>
        </nav>
      </header>
      <main>
        <div className="admin-payments-heading"><div><span>تخزين Render</span><h2>الطلبات المحفوظة</h2></div><button onClick={() => void loadOrders(token)} disabled={loading}>تحديث القائمة</button></div>
        {status && <p className={`admin-payment-message ${status.startsWith("تم تسجيل") ? "success" : "error"}`} role="status">{status}</p>}
        {loading && !orders.length ? <p className="admin-payments-empty">جارٍ تحميل الطلبات...</p> : orders.length ? (
          <section className="admin-payment-list" aria-label="طلبات بانتظار الدفع">
            {orders.map((order) => (
              <article key={order.id}>
                <div className="admin-order-summary"><small>{order.order_number} · {new Date(order.created_at).toLocaleDateString("ar-IQ")}</small><h3>{order.service_title}</h3><span>{order.order_type === "whatsapp_request" ? "أُحيل إلى واتساب لاستكمال المعاملة" : order.status}</span></div>
                <strong>{formatIqd(order.total_iqd)} <small>{order.order_type === "whatsapp_request" ? "د.ع تقديري" : "د.ع"}</small></strong>
                {order.order_type === "whatsapp_request" ? (
                  <a className="admin-payment-confirm" href={`https://wa.me/${order.student_phone?.replace(/\D/g, "") || ""}`} target="_blank" rel="noreferrer">مراسلة الطالب</a>
                ) : (
                  <button className="admin-payment-confirm" onClick={() => setActiveOrder(activeOrder === order.id ? null : order.id)} disabled={loading}>{activeOrder === order.id ? "إغلاق" : "تسجيل قبض يدوي"}</button>
                )}
                {order.order_type === "whatsapp_request" ? (
                  <details className="admin-whatsapp-details"><summary>بيانات الطلب والطالب</summary><div><span>الطالب: {order.full_name}</span><span>الهاتف: {order.student_phone}</span><span>الجامعة والكلية: {order.university} • {order.college}</span><span>القسم: {order.department}</span><span>العنوان: {order.report_title}</span><span>المشرف: {order.supervisor || "غير محدد"}</span><span>التنفيذ: {order.variant || "غير محدد"} • {order.speed || "اعتيادي"}</span><span>القالب واللون: {order.template || "غير محدد"} • {order.preferred_color || "غير محدد"}</span>{order.notes && <span>ملاحظات: {order.notes}</span>}</div></details>
                ) : activeOrder === order.id ? (
                  <form className="admin-payment-form" onSubmit={(event) => void confirmOfflinePayment(event, order.id)}>
                    <label><span>طريقة القبض</span><select name="method" defaultValue="bank_transfer"><option value="bank_transfer">تحويل خارجي</option><option value="cash">نقداً أو تسليم مادي</option></select></label>
                    <label><span>رقم الإيصال أو مرجع التحويل</span><input name="reference" maxLength={120} placeholder="اختياري" /></label>
                    <label className="admin-payment-reason"><span>سبب تأكيد القبض *</span><textarea name="reason" required minLength={5} maxLength={500} rows={2} placeholder="اذكر كيف تم التحقق من استلام المبلغ" /></label>
                    <p>سيُسجّل المشرف والطريقة والسبب والمبلغ ووقت التأكيد. لا يمكن تكرار اعتماد الطلب.</p>
                    <button className="admin-payment-primary" type="submit" disabled={loading}>{loading ? "جارٍ الحفظ..." : "تأكيد استلام المبلغ"}</button>
                  </form>
                ) : null}
              </article>
            ))}
          </section>
        ) : <div className="admin-payments-empty"><strong>لا توجد طلبات بعد</strong><p>ستظهر هنا الطلبات التي حُفظت على قرص Render وأُحيلت إلى واتساب.</p></div>}
      </main>
    </div>
  );
}