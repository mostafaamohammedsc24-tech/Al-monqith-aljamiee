import { useEffect, useState } from "react";
import "./admin-points.css";

type PointLevel = { name: string; minimum: number; perk: string; gift: string };

export default function AdminPointsPage({ onDiscounts }: { onDiscounts: () => void }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("najda-admin-token") || "");
  const [levels, setLevels] = useState<PointLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/admin/points/levels", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as { levels?: PointLevel[]; error?: string };
        if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem("najda-admin-token");
          setToken("");
          throw new Error("انتهت جلسة المشرف. سجّل الدخول من إدارة الخصومات أولاً.");
        }
        if (!response.ok) throw new Error(result.error || "تعذر تحميل المراحل.");
        setLevels(result.levels || []);
        setStatus("");
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "تعذر تحميل المراحل."))
      .finally(() => setLoading(false));
  }, [token]);

  function updateLevel(index: number, field: keyof PointLevel, value: string) {
    setLevels((current) => current.map((level, itemIndex) => itemIndex === index ? {
      ...level,
      [field]: field === "minimum" ? Number(value) : value,
    } : level));
  }

  function addLevel() {
    if (levels.length >= 30) return;
    const previous = levels.at(-2);
    const last = levels.at(-1);
    if (!previous || !last || last.minimum - previous.minimum < 2) {
      setStatus("لا توجد مساحة بين آخر مرحلتين لإضافة مرحلة جديدة.");
      return;
    }
    const minimum = Math.floor((previous.minimum + last.minimum) / 2);
    setLevels((current) => [...current.slice(0, -1), { name: "مرحلة جديدة", minimum, perk: "", gift: "" }, current.at(-1)!]);
    setStatus("");
  }

  function removeLevel(index: number) {
    if (index === 0 || index === levels.length - 1 || levels.length <= 2) return;
    setLevels((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function saveLevels(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/points/levels", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ levels }),
      });
      const result = await response.json().catch(() => ({})) as { levels?: PointLevel[]; error?: string };
      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("najda-admin-token");
        setToken("");
        throw new Error("انتهت جلسة المشرف.");
      }
      if (!response.ok) throw new Error(result.error || "تعذر حفظ التعديلات.");
      setLevels(result.levels || levels);
      setStatus("تم حفظ مراحل النقاط وامتيازاتها وهداياها.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حفظ المراحل.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) return <main className="points-admin points-admin-locked" dir="rtl"><h1>إدارة مراحل النقاط</h1><p>{status || "سجّل الدخول إلى لوحة المشرف أولاً."}</p><button onClick={onDiscounts}>العودة إلى دخول المشرف وإدارة الخصومات</button></main>;

  return (
    <main className="points-admin" dir="rtl">
      <header className="points-admin-header"><div><span>برنامج الولاء</span><h1>المراحل والامتيازات</h1><p>عدّل عتبات النقاط والهدايا والامتيازات الظاهرة للطلاب.</p></div><button onClick={onDiscounts}>إدارة الخصومات</button></header>
      <form onSubmit={saveLevels}>
        <div className="points-admin-toolbar"><span>{levels.length} مرحلة • الحد الأعلى مليون نقطة</span><button type="button" onClick={addLevel}>إضافة مرحلة</button></div>
        {loading && !levels.length ? <p className="points-admin-status">جارٍ التحميل...</p> : levels.map((level, index) => (
          <section className="points-level-editor" key={`${index}-${level.minimum}`}>
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <label>اسم المرحلة<input value={level.name} onChange={(event) => updateLevel(index, "name", event.target.value)} required maxLength={40} /></label>
            <label>النقاط المطلوبة<input type="number" value={level.minimum} onChange={(event) => updateLevel(index, "minimum", event.target.value)} required min={0} max={1000000} /></label>
            <label>الامتياز<input value={level.perk} onChange={(event) => updateLevel(index, "perk", event.target.value)} maxLength={300} /></label>
            <label>الهدية<input value={level.gift} onChange={(event) => updateLevel(index, "gift", event.target.value)} maxLength={300} /></label>
            <button className="points-level-remove" type="button" disabled={index === 0 || index === levels.length - 1} onClick={() => removeLevel(index)} aria-label={`حذف المرحلة ${level.name}`}>حذف</button>
          </section>
        ))}
        {status && <p className="points-admin-status" role="status">{status}</p>}
        <button className="points-admin-save" disabled={loading || !levels.length} type="submit">{loading ? "جارٍ الحفظ..." : "حفظ المراحل"}</button>
      </form>
    </main>
  );
}
