import { useState, type ChangeEvent } from "react";

type CoverDetails = {
  university: string;
  college: string;
  department: string;
  title: string;
  color: string;
  fullName: string;
  supervisor: string;
  date: string;
  universityLogo: string;
  collegeLogo: string;
};

function readLogo(file?: File) {
  if (!file) return Promise.resolve("");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("تعذرت قراءة الصورة."));
    reader.onerror = () => reject(new Error("تعذرت قراءة الصورة."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("تعذر تحميل أحد الشعارات."));
    image.src = source;
  });
}

export default function FreeReportCover({ profile }: { profile: { fullName: string; university: string; college: string; department: string } }) {
  const [details, setDetails] = useState<CoverDetails>({
    university: profile.university,
    college: profile.college,
    department: profile.department,
    title: "",
    color: "#246fae",
    fullName: profile.fullName,
    supervisor: "",
    date: new Date().toISOString().slice(0, 10),
    universityLogo: "",
    collegeLogo: "",
  });
  const [error, setError] = useState("");

  function updateField(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;
    setDetails((current) => ({ ...current, [name]: value }));
  }

  async function updateLogo(event: ChangeEvent<HTMLInputElement>) {
    const name = event.currentTarget.name as "universityLogo" | "collegeLogo";
    const file = event.currentTarget.files?.[0];
    try {
      const logo = await readLogo(file);
      setDetails((current) => ({ ...current, [name]: logo }));
    } catch (logoError) {
      setError(logoError instanceof Error ? logoError.message : "تعذرت قراءة الشعار.");
    }
  }

  async function downloadCover() {
    setError("");
    const form = document.getElementById("report-cover-form") as HTMLFormElement | null;
    if (!form?.reportValidity()) return;
    try {
      await document.fonts.ready;
      const canvas = document.createElement("canvas");
      canvas.width = 1240;
      canvas.height = 1754;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("تعذر تجهيز الصورة للتنزيل.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = details.color;
      context.lineWidth = 8;
      context.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

      const logos = await Promise.all([details.universityLogo, details.collegeLogo].map((source) => source ? loadImage(source) : Promise.resolve(null)));
      logos.forEach((image, index) => {
        if (!image) return;
        const size = 150;
        const scale = Math.min(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = index === 0 ? 92 : canvas.width - 92 - width;
        context.drawImage(image, x, 86 + (size - height) / 2, width, height);
      });

      context.direction = "rtl";
      context.textAlign = "center";
      context.fillStyle = "#263746";
      const drawWrappedText = (text: string, font: string, centerY: number, maxWidth: number, lineHeight: number) => {
        context.font = font;
        const lines: string[] = [];
        let line = "";
        text.split(/\s+/).forEach((word) => {
          const candidate = line ? `${line} ${word}` : word;
          if (line && context.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
          } else {
            line = candidate;
          }
        });
        if (line) lines.push(line);
        lines.forEach((entry, index) => context.fillText(entry, canvas.width / 2, centerY + (index - (lines.length - 1) / 2) * lineHeight, maxWidth));
      };
      drawWrappedText(details.university.trim(), "500 31px Arial, sans-serif", 145, 850, 42);
      drawWrappedText(details.college.trim(), "500 31px Arial, sans-serif", 195, 850, 42);
      drawWrappedText(details.department.trim(), "500 31px Arial, sans-serif", 245, 850, 42);
      context.fillStyle = details.color;
      drawWrappedText(details.title.trim(), "700 66px Arial, sans-serif", 830, 1040, 84);
      context.fillStyle = "#263746";
      drawWrappedText(`إعداد الطالب: ${details.fullName.trim()}`, "600 39px Arial, sans-serif", 1185, 1050, 52);
      drawWrappedText(`إشراف الأستاذ: ${details.supervisor.trim()}`, "600 39px Arial, sans-serif", 1260, 1050, 52);
      context.font = "500 30px Arial, sans-serif";
      context.fillText(new Intl.DateTimeFormat("ar-IQ", { dateStyle: "long" }).format(new Date(`${details.date}T12:00:00`)), canvas.width / 2, 1620, 900);

      const imageBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("تعذر إنشاء ملف الصورة.")), "image/png"));
      const url = URL.createObjectURL(imageBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "واجهة-التقرير.png";
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "تعذر تنزيل واجهة التقرير.");
    }
  }

  return (
    <section className="profile-card free-service-card">
      <div className="profile-card-heading"><div><span>خدمات مجانية من المنقذ الجامعي</span><h2>إنشاء واجهة تقرير</h2></div><span className="free-service-mark">مجاني</span></div>
      <p className="free-service-description">أدخل بيانات التقرير وحمّل واجهته كصورة PNG عالية الدقة.</p>
      <form id="report-cover-form" className="report-cover-form">
        <label>الجامعة<input name="university" value={details.university} onChange={updateField} required /></label>
        <label>الكلية<input name="college" value={details.college} onChange={updateField} required /></label>
        <label>القسم<input name="department" value={details.department} onChange={updateField} required /></label>
        <label className="report-cover-wide">عنوان التقرير<input name="title" value={details.title} onChange={updateField} required maxLength={90} /></label>
        <label>لون العنوان<input className="report-cover-color" name="color" type="color" value={details.color} onChange={updateField} /></label>
        <label>الاسم الثلاثي<input name="fullName" value={details.fullName} onChange={updateField} required /></label>
        <label>الأستاذ المشرف<input name="supervisor" value={details.supervisor} onChange={updateField} required /></label>
        <label>التاريخ<input name="date" type="date" value={details.date} onChange={updateField} required /></label>
        <label>شعار الجامعة<input name="universityLogo" type="file" accept="image/*" onChange={updateLogo} /></label>
        <label>شعار الكلية<input name="collegeLogo" type="file" accept="image/*" onChange={updateLogo} /></label>
      </form>
      <div className="report-cover-preview" style={{ borderColor: details.color }}>
        <div className="report-cover-preview-university">{details.university}<br />{details.college}<br />{details.department}</div>
        {details.universityLogo && <img className="report-cover-preview-logo university" src={details.universityLogo} alt="شعار الجامعة" />}
        {details.collegeLogo && <img className="report-cover-preview-logo college" src={details.collegeLogo} alt="شعار الكلية" />}
        <strong style={{ color: details.color }}>{details.title || "عنوان التقرير"}</strong>
        <div className="report-cover-preview-names">{details.fullName || "الاسم الثلاثي"}<br />إشراف: {details.supervisor || "الأستاذ المشرف"}</div>
        <small>{details.date}</small>
      </div>
      {error && <p className="free-service-error" role="alert">{error}</p>}
      <button className="free-service-download" type="button" onClick={downloadCover}>تنزيل الواجهة كصورة</button>
    </section>
  );
}
