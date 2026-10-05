import { useMemo, useState } from "react";
import "./templates-page.css";

export type TemplateChoice = {
  id: string;
  title: string;
  category: "تقارير" | "عروض تقديمية" | "بوسترات" | "سيرة ذاتية" | "وثائق" | "تقنية";
  description: string;
  meta: string;
  style: string;
  format: "PDF" | "PPTX" | "DOCX" | "FIGMA";
  featured?: boolean;
};

const templates: TemplateChoice[] = [];

const categories = ["الكل", "تقارير", "عروض تقديمية", "بوسترات", "سيرة ذاتية", "وثائق", "تقنية"] as const;

export default function TemplatesPage({ onBack, onSelect }: { onBack: () => void; onSelect: (template: TemplateChoice) => void }) {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("الكل");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => templates.filter((template) => (activeCategory === "الكل" || template.category === activeCategory) && (!query || `${template.title} ${template.description}`.includes(query))), [activeCategory, query]);
  const grouped = categories.slice(1).map((category) => ({ category, templates: visible.filter((template) => template.category === category) })).filter((group) => group.templates.length);

  return (
    <div className="templates-page" dir="rtl">
      <header className="templates-header">
        <button onClick={onBack} aria-label="العودة">←</button>
        <div><strong>مكتبة القوالب</strong><small>المنقذ الجامعي</small></div>
        <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن قالب..." /></label>
      </header>
      <main className="templates-main">
        <section className="templates-hero">
          <div><span>ابدأ من تصميم احترافي</span><h1>اختر القالب الذي يشبه فكرتك</h1><p>تصفّح قوالب التقارير والعروض والبوسترات والوثائق، ثم اختره ليظهر مباشرة داخل طلبك.</p></div>
          <div className="templates-stack"><i /><i /><i /></div>
        </section>
        <section>
          <div className="templates-title"><div><span>استكشف المكتبة</span><h2>الفئات</h2></div><small>اسحب أفقياً للمزيد</small></div>
          <div className="templates-categories">{categories.map((category) => <button className={activeCategory === category ? "active" : ""} key={category} onClick={() => setActiveCategory(category)}><span>{category === "تقارير" ? "PDF" : category === "عروض تقديمية" ? "PPT" : category === "الكل" ? "ALL" : category.slice(0, 2)}</span><b>{category}</b><small>{category === "الكل" ? templates.length : templates.filter((template) => template.category === category).length} قالب</small></button>)}</div>
        </section>
        {grouped.map((group) => <section className="template-group" key={group.category}><div className="templates-title"><div><span>{group.templates.length} قوالب</span><h2>{group.category}</h2></div><button onClick={() => setActiveCategory(group.category)}>عرض الفئة ←</button></div><div className="template-horizontal-row">{group.templates.map((template) => <TemplateCard key={template.id} template={template} onSelect={() => onSelect(template)} />)}</div></section>)}
        {!visible.length && <div className="templates-empty"><span>⌕</span><h2>{templates.length ? "لا توجد قوالب مطابقة" : "لا توجد قوالب منشورة بعد"}</h2><p>{templates.length ? "غيّر البحث أو الفئة لعرض قوالب أخرى." : "ستظهر القوالب هنا بعد نشرها في المكتبة."}</p>{templates.length > 0 && <button onClick={() => { setQuery(""); setActiveCategory("الكل"); }}>عرض جميع القوالب</button>}</div>}
      </main>
    </div>
  );
}

function TemplateCard({ template, featured = false, onSelect }: { template: TemplateChoice; featured?: boolean; onSelect: () => void }) {
  return <article className={`template-library-card ${featured ? "featured" : ""}`}><div className={`template-library-preview ${template.style}`}><span>{template.format}</span><div><i /><i /><i /><b>{template.id}</b></div></div><div className="template-library-info"><span>{template.category} • {template.meta}</span><h3>{template.title}</h3><p>{template.description}</p><button onClick={onSelect}>اختيار هذا القالب <b>←</b></button></div></article>;
}
