import { FormEvent, useEffect, useRef, useState } from "react";
import "./admin-latex.css";

type CompileResult = {
  jobId?: string;
  pdfUrl?: string;
  logs?: string;
  durationMs?: number;
};

const starterTemplates = [
  {
    name: "تقرير عربي",
    compiler: "xelatex",
    source: String.raw`\documentclass[12pt,a4paper]{article}
\usepackage{fontspec}
\usepackage{polyglossia}
\setdefaultlanguage{arabic}
\setotherlanguage{english}
\newfontfamily\arabicfont[Script=Arabic]{Amiri}
\usepackage{geometry}
\geometry{margin=2.5cm}
\title{عنوان التقرير الجامعي}
\author{اسم الطالب}
\date{\today}
\begin{document}
\maketitle
\tableofcontents
\newpage
\section{المقدمة}
اكتب محتوى التقرير هنا.
\section{النتائج}
أضف النتائج والمناقشة.
\end{document}`,
  },
  {
    name: "بحث إنجليزي",
    compiler: "pdflatex",
    source: String.raw`\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage{geometry}
\usepackage{graphicx}
\usepackage{booktabs}
\geometry{margin=1in}
\title{Academic Research Title}
\author{Student Name}
\date{\today}
\begin{document}
\maketitle
\begin{abstract}
Write the abstract here.
\end{abstract}
\section{Introduction}
Start writing your research.
\section{Results}
Add your results and discussion.
\end{document}`,
  },
  {
    name: "عرض Beamer",
    compiler: "xelatex",
    source: String.raw`\documentclass{beamer}
\usetheme{Madrid}
\usepackage{fontspec}
\title{عنوان العرض}
\author{اسم الطالب}
\institute{اسم الجامعة}
\begin{document}
\begin{frame}
  \titlepage
\end{frame}
\begin{frame}{المقدمة}
  \begin{itemize}
    \item الفكرة الأولى
    \item الفكرة الثانية
  \end{itemize}
\end{frame}
\end{document}`,
  },
];

export default function AdminLatexPage({ onBack, onDiscounts }: { onBack: () => void; onDiscounts?: () => void }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("najda-admin-token") || "");
  const [loginError, setLoginError] = useState("");
  const [source, setSource] = useState(starterTemplates[0].source);
  const [compiler, setCompiler] = useState(starterTemplates[0].compiler);
  const [mainFile, setMainFile] = useState("main.tex");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "compiling" | "success" | "error">("idle");
  const [logs, setLogs] = useState("سجل التجميع سيظهر هنا.");
  const [pdfUrl, setPdfUrl] = useState("");
  const [jobId, setJobId] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(import.meta.env.VITE_ADMIN_LOGIN_ENDPOINT || "/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.get("phone"), password: data.get("password") }),
      });
      if (!response.ok) throw new Error("بيانات الدخول غير صحيحة أو خدمة الإدارة غير متصلة.");
      const result = await response.json() as { accessToken?: string };
      if (!result.accessToken) throw new Error("لم يُرجع الخادم جلسة مشرف صالحة.");
      sessionStorage.setItem("najda-admin-token", result.accessToken);
      setToken(result.accessToken);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "تعذر تسجيل الدخول.");
    }
  }

  async function compile() {
    if (!token || status === "compiling" || status === "uploading") return;
    if (!source.trim() || new Blob([source]).size > 1_000_000) {
      setStatus("error");
      setLogs("يجب ألا يكون المصدر فارغًا أو أكبر من 1MB.");
      return;
    }

    setStatus("uploading");
    setLogs("جارٍ رفع المشروع إلى خادم التجميع المعزول...");
    setDuration(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 90_000);
    const body = new FormData();
    body.append("source", source);
    body.append("compiler", compiler);
    body.append("mainFile", mainFile || "main.tex");
    files.forEach((file) => body.append("assets", file, file.name));

    try {
      setStatus("compiling");
      setLogs(`بدأ التجميع باستخدام ${compiler} داخل حاوية آمنة...`);
      const response = await fetch(import.meta.env.VITE_LATEX_COMPILE_ENDPOINT || "/api/latex/compile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { error?: string; logs?: string } | null;
        throw new Error(errorBody?.logs || errorBody?.error || `فشل التجميع (${response.status})`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/pdf")) {
        const blob = await response.blob();
        if (pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(URL.createObjectURL(blob));
        setLogs(decodeURIComponent(response.headers.get("x-compile-message") || "تم إنشاء PDF بنجاح."));
      } else {
        const result = await response.json() as CompileResult;
        if (!result.pdfUrl) throw new Error(result.logs || "اكتمل الطلب دون رابط PDF.");
        setPdfUrl(result.pdfUrl);
        setLogs(result.logs || "تم إنشاء PDF بنجاح.");
        setJobId(result.jobId || "");
        setDuration(result.durationMs || null);
      }
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setLogs(error instanceof DOMException && error.name === "AbortError" ? "تم إيقاف العملية بعد تجاوز 90 ثانية." : error instanceof Error ? error.message : "فشل الاتصال بخادم LaTeX.");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const allowed = [".tex", ".bib", ".sty", ".cls", ".png", ".jpg", ".jpeg", ".pdf", ".csv", ".zip"];
    const next = Array.from(incoming).filter((file) => allowed.some((extension) => file.name.toLowerCase().endsWith(extension)));
    setFiles((current) => [...current, ...next].slice(0, 30));
  }

  if (!token) {
    return (
      <div className="admin-login-page" dir="rtl">
        <button className="admin-back" onClick={onBack}>العودة للموقع</button>
        <form className="admin-login-card" onSubmit={login}>
          <span className="admin-login-mark">T<small>E</small>X</span>
          <p>لوحة مشرفي المنقذ الجامعي</p>
          <h1>تسجيل دخول المشرف</h1>
          <label><span>رقم الهاتف</span><input name="phone" required inputMode="tel" placeholder="07XX XXX XXXX" /></label>
          <label><span>رمز الدخول</span><input name="password" required type="password" placeholder="••••••••••" /></label>
          {loginError && <div className="admin-login-error">{loginError}</div>}
          <button type="submit">الدخول إلى بيئة LaTeX</button>
          <small>يتم التحقق من الصلاحية عبر الخادم، ولا تُحفظ بيانات الدخول في الواجهة.</small>
        </form>
      </div>
    );
  }

  return (
    <div className="latex-admin" dir="rtl">
      <header className="latex-admin-header">
        <div><button onClick={onBack}>العودة</button><span><b>مختبر LaTeX</b><small>لوحة المنقذ الجامعي</small></span></div>
        <div className="latex-server-status"><i className={status === "error" ? "error" : ""} /><span><b>{status === "compiling" ? "جاري التجميع" : status === "error" ? "تعذر الاتصال" : "خادم التجميع"}</b><small>{jobId ? `Job: ${jobId}` : "Docker Sandbox"}</small></span></div>
        <div className="admin-header-actions">{onDiscounts && <button onClick={onDiscounts}>إدارة الخصومات</button>}<button className="admin-logout" onClick={() => { sessionStorage.removeItem("najda-admin-token"); setToken(""); }}>تسجيل الخروج</button></div>
      </header>

      <main className="latex-admin-main">
        <section className="latex-toolbar">
          <div className="latex-template-list">{starterTemplates.map((template) => <button key={template.name} onClick={() => { setSource(template.source); setCompiler(template.compiler); }}>{template.name}</button>)}</div>
          <div className="latex-compile-settings">
            <label><span>المترجم</span><select value={compiler} onChange={(event) => setCompiler(event.target.value)}><option value="xelatex">XeLaTeX — الأفضل للعربية</option><option value="pdflatex">PDFLaTeX</option><option value="lualatex">LuaLaTeX</option></select></label>
            <label><span>الملف الرئيسي</span><input value={mainFile} onChange={(event) => setMainFile(event.target.value)} placeholder="main.tex" /></label>
            <button className="compile-button" disabled={status === "compiling" || status === "uploading"} onClick={compile}>{status === "compiling" ? "جارٍ إنشاء PDF..." : "إنشاء PDF"}</button>
          </div>
        </section>

        <div className="latex-workspace">
          <section className="latex-editor-panel">
            <div className="latex-panel-title"><span><b>المحرر</b><small>{source.split("\n").length} سطر</small></span><span>{compiler}</span></div>
            <div className="latex-editor-wrap"><div className="latex-line-numbers">{source.split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}</div><textarea aria-label="محرر LaTeX" dir="ltr" spellCheck={false} value={source} onChange={(event) => setSource(event.target.value)} /></div>
          </section>

          <section className="latex-preview-panel">
            <div className="latex-panel-title"><span><b>معاينة PDF</b><small>{duration ? `${(duration / 1000).toFixed(1)} ثانية` : "لم يتم التجميع بعد"}</small></span>{pdfUrl && <a href={pdfUrl} download="report.pdf">تحميل PDF</a>}</div>
            {pdfUrl ? <iframe title="معاينة ملف PDF" src={pdfUrl} /> : <div className="latex-empty-preview"><span>PDF</span><h2>المعاينة ستظهر هنا</h2><p>اختر قالبًا أو اكتب المصدر ثم اضغط «إنشاء PDF».</p></div>}
          </section>
        </div>

        <div className="latex-bottom-grid">
          <section className="latex-assets">
            <div className="latex-panel-title"><span><b>ملفات المشروع</b><small>صور، BibTeX، Style أو ZIP كامل</small></span><button onClick={() => fileInputRef.current?.click()}>إضافة ملفات</button></div>
            <input ref={fileInputRef} hidden multiple type="file" accept=".tex,.bib,.sty,.cls,.png,.jpg,.jpeg,.pdf,.csv,.zip" onChange={(event) => addFiles(event.target.files)} />
            <div className="latex-file-list">{files.length ? files.map((file, index) => <span key={`${file.name}-${index}`}><i>{file.name.split(".").pop()?.toUpperCase()}</i><b>{file.name}</b><small>{(file.size / 1024).toFixed(1)} KB</small><button onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>×</button></span>) : <p>اسحب الملفات هنا لاحقًا أو استخدم زر «إضافة ملفات».</p>}</div>
          </section>
          <section className={`latex-logs ${status}`}><div className="latex-panel-title"><span><b>سجل التجميع</b><small>يتم تنظيف السجل من مسارات الخادم</small></span><button onClick={() => navigator.clipboard.writeText(logs)}>نسخ</button></div><pre dir="ltr">{logs}</pre></section>
        </div>
      </main>
    </div>
  );
}
