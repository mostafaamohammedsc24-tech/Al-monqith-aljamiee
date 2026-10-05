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

const templates: TemplateChoice[] = [
  { id: "REP-01", title: "الأكاديمي الأزرق", category: "تقارير", description: "قالب رسمي منظم للتقارير والبحوث الجامعية.", meta: "24 صفحة", style: "academic-blue", format: "PDF", featured: true },
  { id: "REP-02", title: "البحث الكلاسيكي", category: "تقارير", description: "هوامش وفهرسة وعناوين ملائمة للبحوث.", meta: "32 صفحة", style: "classic", format: "PDF" },
  { id: "REP-03", title: "التقرير الهندسي", category: "تقارير", description: "جداول ورسوم ومخططات للمشاريع الهندسية.", meta: "28 صفحة", style: "engineering", format: "PDF", featured: true },
  { id: "REP-04", title: "المختبر العلمي", category: "تقارير", description: "نتائج وتجارب وجداول قياسات واضحة.", meta: "18 صفحة", style: "laboratory", format: "PDF" },
  { id: "PPT-01", title: "مناقشة التخرج", category: "عروض تقديمية", description: "عرض متوازن لمناقشة مشروع أو رسالة.", meta: "24 شريحة", style: "defense", format: "PPTX", featured: true },
  { id: "PPT-02", title: "تقنية المستقبل", category: "عروض تقديمية", description: "واجهات داكنة ورسوم بصرية للتخصصات التقنية.", meta: "18 شريحة", style: "future", format: "PPTX" },
  { id: "PPT-03", title: "Minimal أكاديمي", category: "عروض تقديمية", description: "تصميم هادئ يركز على وضوح المحتوى.", meta: "20 شريحة", style: "minimal", format: "PPTX", featured: true },
  { id: "PPT-04", title: "إدارة الأعمال", category: "عروض تقديمية", description: "مؤشرات وجداول وعروض للمشاريع الإدارية.", meta: "26 شريحة", style: "business", format: "PPTX" },
  { id: "POS-01", title: "البوستر العلمي", category: "بوسترات", description: "تكوين A1 للمؤتمرات والمعارض العلمية.", meta: "A1 للطباعة", style: "poster-science", format: "FIGMA", featured: true },
  { id: "POS-02", title: "معرض المشاريع", category: "بوسترات", description: "مساحة كبيرة للصور والنتائج والنموذج الأولي.", meta: "A0 للطباعة", style: "poster-project", format: "FIGMA" },
  { id: "POS-03", title: "فعالية طلابية", category: "بوسترات", description: "قالب شبابي للإعلانات والأنشطة الجامعية.", meta: "رقمي وطباعة", style: "poster-event", format: "FIGMA" },
  { id: "CV-01", title: "CV متوافق مع ATS", category: "سيرة ذاتية", description: "بنية واضحة لأنظمة تتبع طلبات التوظيف.", meta: "صفحتان", style: "cv-ats", format: "DOCX", featured: true },
  { id: "CV-02", title: "CV حديث بعمودين", category: "سيرة ذاتية", description: "مناسب للطلاب والخريجين وبداية المسار المهني.", meta: "صفحتان", style: "cv-modern", format: "DOCX" },
  { id: "CV-03", title: "Portfolio إبداعي", category: "سيرة ذاتية", description: "للمصممين والمهندسين وأصحاب المشاريع.", meta: "12 صفحة", style: "portfolio", format: "PDF" },
  { id: "DOC-01", title: "نموذج جامعي رسمي", category: "وثائق", description: "حقول منظمة للطباعة والتعبئة الإلكترونية.", meta: "A4", style: "official", format: "PDF" },
  { id: "DOC-02", title: "خطة بحث", category: "وثائق", description: "هيكل واضح للمشكلة والأهداف والمنهجية.", meta: "8 صفحات", style: "proposal", format: "DOCX" },
  { id: "DOC-03", title: "استبيان أكاديمي", category: "وثائق", description: "أسئلة ومحاور قابلة للتعديل والتحليل.", meta: "6 صفحات", style: "survey", format: "DOCX" },
  { id: "TEC-01", title: "لوحة تحكم مشروع", category: "تقنية", description: "واجهة Dashboard منظمة للأنظمة الجامعية.", meta: "12 شاشة", style: "dashboard", format: "FIGMA", featured: true },
  { id: "TEC-02", title: "بوابة قسم جامعي", category: "تقنية", description: "صفحات أخبار وخدمات وأعضاء الهيئة التدريسية.", meta: "8 صفحات", style: "portal", format: "FIGMA" },
  { id: "TEC-03", title: "تطبيق مشروع تخرج", category: "تقنية", description: "واجهات هاتف متكاملة للعرض والنموذج الأولي.", meta: "16 شاشة", style: "mobile-app", format: "FIGMA" },
];

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
        <section className="featured-templates">
          <div className="templates-title"><div><span>الأكثر اختيارًا</span><h2>قوالب مميزة</h2></div></div>
          <div className="templates-featured-row">{visible.filter((template) => template.featured).map((template) => <TemplateCard key={template.id} template={template} featured onSelect={() => onSelect(template)} />)}</div>
        </section>
        {grouped.map((group) => <section className="template-group" key={group.category}><div className="templates-title"><div><span>{group.templates.length} قوالب</span><h2>{group.category}</h2></div><button onClick={() => setActiveCategory(group.category)}>عرض الفئة ←</button></div><div className="template-horizontal-row">{group.templates.map((template) => <TemplateCard key={template.id} template={template} onSelect={() => onSelect(template)} />)}</div></section>)}
        {!visible.length && <div className="templates-empty"><span>⌕</span><h2>لا توجد قوالب مطابقة</h2><button onClick={() => { setQuery(""); setActiveCategory("الكل"); }}>عرض جميع القوالب</button></div>}
      </main>
    </div>
  );
}

function TemplateCard({ template, featured = false, onSelect }: { template: TemplateChoice; featured?: boolean; onSelect: () => void }) {
  return <article className={`template-library-card ${featured ? "featured" : ""}`}><div className={`template-library-preview ${template.style}`}><span>{template.format}</span><div><i /><i /><i /><b>{template.id}</b></div></div><div className="template-library-info"><span>{template.category} • {template.meta}</span><h3>{template.title}</h3><p>{template.description}</p><button onClick={onSelect}>اختيار هذا القالب <b>←</b></button></div></article>;
}
