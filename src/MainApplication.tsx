// @refresh reset
import { FormEvent, lazy, ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import "./market-share.css";
import type { TemplateChoice } from "./TemplatesPage";

const AdminLatexPage = lazy(() => import("./AdminLatexPage"));
const TemplatesPage = lazy(() => import("./TemplatesPage"));
const AdminDiscountsPage = lazy(() => import("./AdminDiscountsPage"));
const AdminPaymentsPage = lazy(() => import("./AdminPaymentsPage"));
const AdminServicesPage = lazy(() => import("./AdminServicesPage"));

type IconName =
  | "arrow"
  | "bag"
  | "book"
  | "cart"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "file"
  | "grid"
  | "headphones"
  | "menu"
  | "phone"
  | "play"
  | "plus"
  | "receipt"
  | "palette"
  | "pen"
  | "presentation"
  | "search"
  | "share"
  | "shield"
  | "sparkles"
  | "star"
  | "store"
  | "trophy"
  | "user";

function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m15 18-6-6 6-6" />,
    bag: (
      <>
        <path d="M6 8h12l1 12H5L6 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22.5v-17Z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5a2.5 2.5 0 0 1 2.5 2.5v-17Z" />
      </>
    ),
    cart: (
      <>
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
        <path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6V2Z" />
        <path d="M14 2v5h5M9 13h6M9 17h6" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    headphones: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    phone: (
      <>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5V7Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    receipt: (
      <>
        <path d="M5 3v18l3-2 3 2 3-2 3 2 2-1.5V3l-2 1.5L14 3l-3 1.5L8 3 5 4.5" />
        <path d="M9 9h6M9 13h6" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h2.5A6.5 6.5 0 0 0 21 7.5C21 5 17 3 12 3Z" />
        <circle cx="7.5" cy="10.5" r=".6" fill="currentColor" />
        <circle cx="10" cy="7" r=".6" fill="currentColor" />
        <circle cx="14" cy="7" r=".6" fill="currentColor" />
      </>
    ),
    pen: (
      <>
        <path d="m4 20 4.5-1L19 8.5 15.5 5 5 15.5 4 20Z" />
        <path d="m13.5 7 3.5 3.5" />
      </>
    ),
    presentation: (
      <>
        <rect x="3" y="3" width="18" height="13" rx="2" />
        <path d="M8 21l4-5 4 5M8 8h8M8 12h5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" />
        <path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" />
        <path d="m19 13 .6 1.4L21 15l-1.4.6L19 17l-.6-1.4L17 15l1.4-.6L19 13Z" />
      </>
    ),
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    store: (
      <>
        <path d="M4 10v11h16V10" />
        <path d="M3 4h18l-1 6a3 3 0 0 1-5 1 3 3 0 0 1-6 0 3 3 0 0 1-5-1L3 4ZM9 21v-6h6v6" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM12 13v4M8 21h8M10 17h4" />
        <path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}

type Service = {
  id: number;
  category: string;
  title: string;
  description: string;
  price: string;
  duration: string;
  icon: IconName;
  color: string;
  delivery: "رقمي" | "حضوري" | "رقمي وحضوري";
  provider: "تنفيذ آلي" | "مقدم خدمة" | "مختص أكاديمي";
  templateGroup: "تقارير" | "عروض" | "تصاميم" | "سيرة مهنية" | "وثائق" | "تقنية" | null;
  popular?: boolean;
  showPrice: boolean;
  features: string[];
  templates?: { name: string; style: string; description: string }[];
  variants?: string[];
};

type AppliedCoupon = {
  code: string;
  type: "fixed" | "percentage";
  value: number;
};

type MarketListing = {
  id: string;
  title: string;
  price: number;
  tag: string;
  style: string;
  category: string;
  kind: "منتج" | "خدمة";
  mediaType: "صورة" | "فيديو";
  description: string;
  location: string;
  seller: string;
  createdAt: string;
  mediaUrl?: string;
};

const marketCategories = [
  "الكل",
  "طعام ومشروبات",
  "مكياج وعناية",
  "أزياء وإكسسوارات",
  "هدايا وأعمال يدوية",
  "خدمات رقمية",
  "تصوير ومونتاج",
  "كتب وملخصات",
  "أجهزة وتقنية",
  "مختبر وهندسة",
  "سكن ونقل",
  "رياضة ولياقة",
  "ألعاب وترفيه",
  "خدمات طلابية",
  "أخرى",
];

function MarketStorePage({
  items,
  query,
  category,
  kind,
  onQuery,
  onCategory,
  onKind,
  onBack,
  onPublish,
  onPurchase,
  onShare,
  onDetails,
}: {
  items: MarketListing[];
  query: string;
  category: string;
  kind: string;
  onQuery: (value: string) => void;
  onCategory: (value: string) => void;
  onKind: (value: string) => void;
  onBack: () => void;
  onPublish: (mode: "منتج" | "خدمة" | "ريل") => void;
  onPurchase: (item: MarketListing) => void;
  onShare: (item: MarketListing) => void;
  onDetails: (item: MarketListing) => void;
}) {
  const featured = items.slice(0, 6);
  const grouped = marketCategories
    .slice(1)
    .map((name) => ({ name, items: items.filter((item) => item.category === name) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="store-page" dir="rtl">
      <header className="store-header">
        <div className="store-header-inner">
          <button className="store-back" onClick={onBack} aria-label="العودة للرئيسية"><Icon name="arrow" size={20} /></button>
          <button className="store-brand" onClick={onBack}><span className="logo-mark"><Icon name="store" size={23} /></span><span><strong>سوق الجامعة</strong><small>ادعم مشاريع الطلبة</small></span></button>
          <div className="store-header-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="ابحث في السوق..." /></div>
          <button className="store-sell" onClick={() => onPublish("منتج")}><Icon name="plus" size={17} /> انشر إعلانك</button>
        </div>
      </header>

      <main className="store-main">
        <section className="store-hero">
          <div><span>سوق من الطلبة وإلى الطلبة</span><h1>اكتشف مشاريع ومنتجات مجتمعك الجامعي</h1><p>طعام، أزياء، عناية، خدمات، أجهزة وأكثر — شراء آمن ودفع إلكتروني عبر Wayl.</p><div><button onClick={() => onPublish("منتج")}><Icon name="bag" size={18} /> بيع منتج</button><button onClick={() => onPublish("ريل")}><Icon name="play" size={18} /> انشر فيديو</button></div></div>
          <span className="store-hero-art"><Icon name="store" size={76} /><i><Icon name="sparkles" size={25} /></i></span>
        </section>

        <section className="store-category-section">
          <div className="store-section-title"><div><span>تصفح سريع</span><h2>تسوّق حسب الفئة</h2></div><small>اسحب أفقياً للمزيد</small></div>
          <div className="store-category-scroll">
            {marketCategories.map((name, index) => {
              const icons: IconName[] = ["grid", "bag", "sparkles", "user", "star", "grid", "play", "book", "grid", "palette", "store", "trophy", "play", "book", "plus"];
              return <button className={category === name ? "active" : ""} key={name} onClick={() => onCategory(name)}><span><Icon name={icons[index] || "bag"} size={22} /></span><b>{name}</b><small>{name === "الكل" ? items.length : items.filter((item) => item.category === name).length} إعلان</small></button>;
            })}
          </div>
        </section>

        <section className="store-featured">
          <div className="store-section-title"><div><span>مختارات اليوم</span><h2>الأحدث في السوق</h2></div><div className="store-kind-filter"><button className={kind === "الكل" ? "active" : ""} onClick={() => onKind("الكل")}>الكل</button><button className={kind === "منتج" ? "active" : ""} onClick={() => onKind("منتج")}>منتجات</button><button className={kind === "خدمة" ? "active" : ""} onClick={() => onKind("خدمة")}>خدمات</button></div></div>
          <div className="store-card-row">
            {featured.map((item) => <StoreProductCard item={item} key={item.id} onPurchase={() => onPurchase(item)} onShare={() => onShare(item)} onDetails={() => onDetails(item)} />)}
          </div>
        </section>

        {grouped.map((group) => (
          <section className="store-group" key={group.name}>
            <div className="store-section-title"><div><span>{group.items.length} خيارات</span><h2>{group.name}</h2></div><button onClick={() => onCategory(group.name)}>عرض الفئة <Icon name="arrow" size={15} /></button></div>
            <div className="store-card-row compact">{group.items.map((item) => <StoreProductCard item={item} key={item.id} onPurchase={() => onPurchase(item)} onShare={() => onShare(item)} onDetails={() => onDetails(item)} />)}</div>
          </section>
        ))}

        {items.length === 0 && <div className="store-empty"><Icon name="search" size={34} /><h2>لا توجد نتائج مطابقة</h2><p>جرّب كلمة أخرى أو اختر فئة مختلفة.</p><button onClick={() => { onQuery(""); onCategory("الكل"); onKind("الكل"); }}>مسح عوامل البحث</button></div>}
      </main>

      <nav className="store-mobile-nav"><button onClick={onBack}><Icon name="book" size={20} /><span>الرئيسية</span></button><button className="active"><Icon name="store" size={20} /><span>السوق</span></button><button onClick={() => onPublish("ريل")}><Icon name="play" size={20} /><span>ريلز</span></button><button onClick={() => onPublish("منتج")}><Icon name="plus" size={20} /><span>بيع</span></button></nav>
    </div>
  );
}

function StoreProductCard({ item, onPurchase, onShare, onDetails }: { item: MarketListing; onPurchase: () => void; onShare: () => void; onDetails: () => void }) {
  return (
    <article className="store-product-card">
      <button className="store-card-share" onClick={onShare} aria-label={`مشاركة ${item.title}`}><Icon name="share" size={16} /></button>
      <div className="store-product-carousel">
        <div className={`store-slide ${item.style}`}>
          {item.mediaUrl && item.mediaType === "صورة" ? <img src={item.mediaUrl} alt={item.title} loading="lazy" /> : item.mediaUrl ? <video src={item.mediaUrl} muted preload="metadata" playsInline /> : <span><Icon name={item.kind === "خدمة" ? "sparkles" : "bag"} size={43} /><small>{item.category}</small></span>}
        </div>
        <div className="store-slide details"><span><small>السعر</small><strong>{formatPrice(item.price)} د.ع</strong><i>{item.tag}</i></span></div>
        <div className="store-slide seller"><span><Icon name="user" size={29} /><strong>{item.seller}</strong><small>{item.location}</small></span></div>
      </div>
      <div className="store-carousel-dots"><i /><i /><i /></div>
      <div className="store-product-body"><span className="store-product-category">{item.kind} • {item.category}</span><button className="store-product-title" onClick={onDetails}><h3>{item.title}</h3><p>{item.description}</p></button><div><strong>{formatPrice(item.price)} <small>د.ع</small></strong><button onClick={onPurchase}>{item.kind === "خدمة" ? "اطلب الآن" : "اشترِ الآن"} <Icon name="arrow" size={15} /></button></div></div>
    </article>
  );
}

function ProfilePage({
  profile,
  points,
  dailyClaimed,
  orders,
  onClaimDaily,
  onBack,
  onEdit,
  onLogin,
  onSignOut,
}: {
  profile: StudentProfile | null;
  points: number;
  dailyClaimed: boolean;
  orders: SavedOrder[];
  onClaimDaily: () => void;
  onBack: () => void;
  onEdit: () => void;
  onLogin: () => void;
  onSignOut: () => void;
}) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => "Notification" in window ? Notification.permission : "denied");
  const [notificationSettings, setNotificationSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("najda-notification-settings") || '{"orders":true,"offers":true,"market":false}');
    } catch {
      return { orders: true, offers: true, market: false };
    }
  });

  const referralCode = useMemo(() => {
    if (!profile) return "";
    const source = `${profile.phone}-${profile.fullName}`;
    let hash = 2166136261;
    for (let index = 0; index < source.length; index++) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `MNQ-${(hash >>> 0).toString(36).toUpperCase()}`;
  }, [profile]);

  const referralUrl = referralCode ? `${window.location.origin}/?ref=${referralCode}` : "";
  const levels = [
    { name: "برونزي", minimum: 0, className: "bronze" },
    { name: "فضي", minimum: 200, className: "silver" },
    { name: "ذهبي", minimum: 500, className: "gold" },
    { name: "ماسي", minimum: 1000, className: "diamond" },
  ];
  const currentLevel = [...levels].reverse().find((level) => points >= level.minimum) || levels[0];
  const nextLevel = levels.find((level) => level.minimum > points);
  const progressStart = currentLevel.minimum;
  const progressEnd = nextLevel?.minimum || currentLevel.minimum + 500;
  const progress = Math.min(100, ((points - progressStart) / Math.max(1, progressEnd - progressStart)) * 100);

  function updateNotificationSetting(key: "orders" | "offers" | "market") {
    const next = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(next);
    localStorage.setItem("najda-notification-settings", JSON.stringify(next));
  }

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  function shareReferral() {
    const message = `انضم إلى المنقذ الجامعي من خلال رابط دعوتي واحصل على خدمات وسوق جامعي متكامل:\n${referralUrl}\n\nرمز الإحالة: ${referralCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  if (!profile) {
    return (
      <div className="profile-page guest" dir="rtl">
        <header className="profile-header"><button onClick={onBack}><Icon name="arrow" size={20} /></button><strong>الملف الشخصي</strong></header>
        <main className="profile-guest"><span><Icon name="user" size={38} /></span><h1>سجّل دخولك إلى حسابك</h1><p>احفظ نقاطك وطلباتك وسجّل حضورك اليومي واحصل على رابط إحالة خاص بك.</p><button onClick={onLogin}>تسجيل الدخول أو إنشاء حساب</button></main>
      </div>
    );
  }

  return (
    <div className="profile-page" dir="rtl">
      <header className="profile-header">
        <div><button onClick={onBack} aria-label="العودة للرئيسية"><Icon name="arrow" size={20} /></button><span><strong>ملفي الشخصي</strong><small>الحساب والمكافآت والإشعارات</small></span></div>
        <button className="profile-edit" onClick={onEdit}><Icon name="pen" size={15} /> تعديل المعلومات</button>
      </header>

      <main className="profile-main">
        <section className="profile-identity">
          <div className="profile-avatar">{profile.fullName.trim().charAt(0)}</div>
          <div><span>مرحباً بعودتك</span><h1>{profile.fullName}</h1><p>{profile.university} • {profile.college}</p></div>
          <span className={`profile-level-badge ${currentLevel.className}`}><Icon name="trophy" size={17} /> المستوى {currentLevel.name}</span>
        </section>

        <div className="profile-layout">
          <div className="profile-primary">
            <section className="daily-checkin-card">
              <div><span className="section-kicker">مكافأة يومية</span><h2>{dailyClaimed ? "تم تسجيل حضورك اليوم" : "سجّل حضورك اليومي"}</h2><p>{dailyClaimed ? "عد غداً لتحصل على نقاط جديدة وتحافظ على نشاط حسابك." : "زيارة بسيطة كل يوم تمنحك 15 نقطة تضاف مباشرة إلى رصيدك."}</p></div>
              <button className={dailyClaimed ? "claimed" : ""} disabled={dailyClaimed} onClick={onClaimDaily}><span><Icon name={dailyClaimed ? "check" : "star"} size={24} /></span><b>{dailyClaimed ? "تم الحضور" : "+15 نقطة"}</b><small>{dailyClaimed ? "مكتملة لليوم" : "اضغط للتسجيل"}</small></button>
            </section>

            <section className="profile-card points-card">
              <div className="profile-card-heading"><div><span>برنامج الولاء</span><h2>مستواي ونقاطي</h2></div><strong>{points}<small> نقطة</small></strong></div>
              <div className="profile-progress"><span style={{ width: `${progress}%` }} /></div>
              <div className="profile-progress-caption"><span>{currentLevel.name}</span><span>{nextLevel ? `${nextLevel.minimum - points} نقطة إلى ${nextLevel.name}` : "وصلت إلى أعلى مستوى"}</span></div>
              <div className="profile-levels">{levels.map((level) => <div className={`${level.className} ${level.name === currentLevel.name ? "active" : ""}`} key={level.name}><i /><b>{level.name}</b><small>{level.minimum} نقطة</small></div>)}</div>
              <p className="points-value"><Icon name="sparkles" size={15} /> كل 100 نقطة تمنحك خصم 1,000 د.ع عند طلب الخدمات.</p>
            </section>

            <section className="profile-card referral-card">
              <div className="profile-card-heading"><div><span>ادعُ أصدقاءك</span><h2>رابط الإحالة الخاص بي</h2></div><span className="referral-reward">+75 نقطة</span></div>
              <p>شارك رابطك، وعند تسجيل صديق جديد وإكمال أول طلب ناجح تُضاف النقاط إلى حسابك تلقائيًا.</p>
              <div className="referral-link"><span>{referralUrl}</span><button onClick={() => navigator.clipboard.writeText(referralUrl)} aria-label="نسخ الرابط"><Icon name="file" size={16} /></button></div>
              <button className="whatsapp-share" onClick={shareReferral}><Icon name="phone" size={18} /> مشاركة رابط الإحالة عبر واتساب</button>
              <small className="referral-code">رمزك الخاص: <b>{referralCode}</b></small>
            </section>

            <section className="profile-card profile-orders">
              <div className="profile-card-heading"><div><span>آخر النشاطات</span><h2>طلباتي الأخيرة</h2></div><strong>{orders.length}<small> طلب</small></strong></div>
              {orders.length ? orders.slice(0, 3).map((order) => <article key={order.id}><span><Icon name="file" size={18} /></span><div><small>{order.id} • {order.date}</small><b>{order.service}</b></div><em>{order.status}</em></article>) : <div className="profile-orders-empty">لم تنشئ أي طلب حتى الآن.</div>}
            </section>
          </div>

          <aside className="profile-sidebar">
            <section className="profile-card student-info">
              <div className="profile-card-heading"><div><span>المعلومات المحفوظة</span><h2>بياناتي الجامعية</h2></div></div>
              {[["رقم الهاتف", profile.phone], ["الجامعة", profile.university], ["الكلية", profile.college], ["القسم", profile.department], ["المرحلة", profile.stage]].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
              <button onClick={onEdit}><Icon name="pen" size={14} /> تحديث البيانات</button>
            </section>

            <section className="profile-card notification-card">
              <div className="profile-card-heading"><div><span>تفضيلات الحساب</span><h2>الإشعارات</h2></div><Icon name="headphones" size={21} /></div>
              {notificationPermission !== "granted" && <div className="notification-permission"><p>فعّل الإشعارات لتصلك تحديثات الطلب والدفع.</p><button onClick={enableNotifications}>السماح بالإشعارات</button></div>}
              {[
                ["orders", "تحديثات الطلبات", "الحالة والدفع والتسليم"],
                ["offers", "الخصومات والعروض", "أكواد الخصم والمكافآت"],
                ["market", "سوق الجامعة", "المنتجات والرسائل الجديدة"],
              ].map(([key, title, detail]) => <button className="notification-toggle" key={key} onClick={() => updateNotificationSetting(key as "orders" | "offers" | "market")}><span><b>{title}</b><small>{detail}</small></span><i className={notificationSettings[key] ? "on" : ""}><em /></i></button>)}
            </section>

            <button className="profile-signout" onClick={onSignOut}>تسجيل الخروج</button>
          </aside>
        </div>
      </main>
    </div>
  );
}

type SavedOrder = {
  id: string;
  service: string;
  date: string;
  total: number;
  status: "بانتظار التدقيق" | "بانتظار الدفع";
};

type StudentProfile = {
  fullName: string;
  phone: string;
  university: string;
  college: string;
  department: string;
  stage: string;
  referredBy?: string;
};

const WHATSAPP_NUMBER = "9647740080310";

const speedOptions = [
  { id: "normal", label: "اعتيادي", detail: "حسب مدة الخدمة", extra: 0 },
  { id: "priority", label: "سريع", detail: "خلال 48 ساعة", extra: 5000 },
  { id: "urgent", label: "مستعجل جداً", detail: "خلال 24 ساعة", extra: 10000 },
];

const serviceTemplates: Record<string, { name: string; style: string; description: string }[]> = {
  "تقارير": [
    { name: "أكاديمي كلاسيكي", style: "t1", description: "هوامش رسمية وعناوين واضحة" },
    { name: "بحث حديث", style: "t2", description: "تخطيط نظيف مع إبراز البيانات" },
    { name: "رسمي داكن", style: "t3", description: "هوية قوية للمشاريع المتقدمة" },
  ],
  "عروض": [
    { name: "عرض Minimal", style: "t2", description: "مساحات هادئة ومحتوى مركز" },
    { name: "عرض بصري", style: "t4", description: "صور ورسوم وبيانات بارزة" },
    { name: "عرض المناقشة", style: "t3", description: "مهيأ للمشاريع واللجان" },
  ],
  "تصاميم": [
    { name: "هندسي شبكي", style: "t5", description: "تكوين منظم وحديث" },
    { name: "علمي نظيف", style: "t2", description: "ألوان هادئة ووضوح عالٍ" },
    { name: "إبداعي ملون", style: "t4", description: "طابع شبابي ملفت" },
  ],
  "سيرة مهنية": [
    { name: "مهني ATS", style: "t1", description: "مهيأ لأنظمة التوظيف" },
    { name: "حديث بعمودين", style: "t2", description: "ملائم للطلاب والخريجين" },
    { name: "Portfolio بصري", style: "t4", description: "للتخصصات الإبداعية" },
  ],
  "وثائق": [
    { name: "نموذج رسمي", style: "t1", description: "متوافق مع المعاملات" },
    { name: "نموذج مبسط", style: "t2", description: "سهل القراءة والتعبئة" },
    { name: "أرشفة رقمية", style: "t5", description: "منظم للحفظ والاسترجاع" },
  ],
  "تقنية": [
    { name: "واجهة لوحة تحكم", style: "t5", description: "للأنظمة الإدارية" },
    { name: "واجهة طلابية", style: "t2", description: "خفيفة وسهلة الاستخدام" },
    { name: "بوابة مؤسسة", style: "t3", description: "هوية رسمية متكاملة" },
  ],
};

const formatPrice = (value: number) => new Intl.NumberFormat("ar-IQ").format(value);

type AppPage = "home" | "market" | "profile" | "templates" | "admin-login" | "admin-payments" | "admin-services" | "admin-latex" | "admin-discounts";

function pageFromPath(pathname: string): AppPage {
  if (pathname.startsWith("/admin/discounts")) return "admin-discounts";
  if (pathname.startsWith("/admin/latex")) return "admin-latex";
  if (pathname.startsWith("/admin/payments")) return "admin-payments";
  if (pathname.startsWith("/admin/services")) return "admin-services";
  if (pathname.startsWith("/admin/login")) return "admin-login";
  if (pathname.startsWith("/templates")) return "templates";
  if (pathname.startsWith("/market")) return "market";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}

export default function App() {
  const [page, setPage] = useState<AppPage>(() => pageFromPath(window.location.pathname));
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoadError, setServicesLoadError] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [orderStep, setOrderStep] = useState<"details" | "form" | "success">("details");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [activeSection, setActiveSection] = useState("catalog");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("الكل");
  const [catalogLimit, setCatalogLimit] = useState(12);
  const [menuOpen, setMenuOpen] = useState(false);
  const [speed, setSpeed] = useState("normal");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("najda-profile") || "null");
    } catch {
      return null;
    }
  });
  const accountStorageId = profile?.phone.replace(/\D/g, "") || "guest";
  const [points, setPoints] = useState(() => Number(localStorage.getItem(`najda-points-${accountStorageId}`) || localStorage.getItem("najda-points") || 0));
  const [dailyClaimed, setDailyClaimed] = useState(
    () => localStorage.getItem(`najda-daily-claim-${accountStorageId}`) === new Date().toISOString().slice(0, 10),
  );
  const [showOrders, setShowOrders] = useState(false);
  const [authOpen, setAuthOpen] = useState(() => !localStorage.getItem("najda-profile"));
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [authError, setAuthError] = useState("");
  const [listingOpen, setListingOpen] = useState(false);
  const [listingError, setListingError] = useState("");
  const [listingMode, setListingMode] = useState<"منتج" | "خدمة" | "ريل">("منتج");
  const [listingMediaName, setListingMediaName] = useState("");
  const [marketQuery, setMarketQuery] = useState("");
  const [marketCategory, setMarketCategory] = useState("الكل");
  const [marketKind, setMarketKind] = useState("الكل");
  const [marketListings, setMarketListings] = useState<MarketListing[]>([]);
  const [purchaseItem, setPurchaseItem] = useState<MarketListing | null>(null);
  const [shareItem, setShareItem] = useState<MarketListing | null>(null);
  const [productDetail, setProductDetail] = useState<MarketListing | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [orders, setOrders] = useState<SavedOrder[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("najda-orders") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/services")
      .then(async (response) => {
        if (!response.ok) throw new Error("تعذر تحميل الخدمات المنشورة.");
        return response.json() as Promise<{ services?: Array<{ title: string; category: string; description: string; base_price_iqd: number; duration_label: string; icon: string; color: string; features: string[]; variants: string[]; delivery: Service["delivery"]; provider: Service["provider"]; template_group: Service["templateGroup"]; show_price: boolean }> }>;
      })
      .then((result) => {
        if (cancelled) return;
        setServices((result.services || []).map((service, index) => ({
          id: index + 1,
          category: service.category,
          title: service.title,
          description: service.description,
          price: String(service.base_price_iqd),
          duration: service.duration_label,
          icon: service.icon as IconName,
          color: service.color,
          delivery: service.delivery,
          provider: service.provider,
          templateGroup: service.template_group,
          features: service.features || [],
          templates: service.template_group ? serviceTemplates[service.template_group] : undefined,
          variants: service.variants || [],
          showPrice: service.show_price,
        })));
        setServicesLoadError("");
      })
      .catch((error: unknown) => {
        if (!cancelled) setServicesLoadError(error instanceof Error ? error.message : "تعذر تحميل الخدمات.");
      });
    return () => { cancelled = true; };
  }, []);

  const serviceCategories = ["الكل", ...new Set(services.map((service) => service.category))];
  const catalogCategories = serviceCategories.slice(1).map((name) => ({
    name,
    count: services.filter((service) => service.category === name).length,
  }));
  const visibleServices = useMemo(() => {
    return activeCategory === "الكل" ? services : services.filter((service) => service.category === activeCategory);
  }, [activeCategory, services]);

  const filteredCatalog = useMemo(() => {
    const normalizedQuery = catalogQuery.trim().toLocaleLowerCase("ar");
    return services.filter((service) => {
      const categoryMatches = catalogCategory === "الكل" || service.category === catalogCategory;
      const queryMatches =
        !normalizedQuery ||
        service.title.toLocaleLowerCase("ar").includes(normalizedQuery) ||
        service.category.toLocaleLowerCase("ar").includes(normalizedQuery) ||
        service.description.toLocaleLowerCase("ar").includes(normalizedQuery);
      return categoryMatches && queryMatches;
    });
  }, [services, catalogCategory, catalogQuery]);

  const filteredMarket = useMemo(() => {
    const query = marketQuery.trim().toLocaleLowerCase("ar");
    return marketListings.filter((item) => {
      const matchesQuery = !query || item.title.toLocaleLowerCase("ar").includes(query) || item.description.toLocaleLowerCase("ar").includes(query);
      const matchesCategory = marketCategory === "الكل" || item.category === marketCategory;
      const matchesKind = marketKind === "الكل" || item.kind === marketKind;
      return matchesQuery && matchesCategory && matchesKind;
    });
  }, [marketListings, marketQuery, marketCategory, marketKind]);

  // Keep the legacy render name stable across Vite hot updates while using the new filtered data source.
  const marketItems = filteredMarket;
  const marketReels = useMemo(() => marketListings.filter((item) => item.mediaType === "فيديو"), [marketListings]);

  useEffect(() => {
    if (page !== "market") return;
    const match = window.location.pathname.match(/^\/market\/product\/([^/]+)$/);
    if (!match) return;
    const listing = marketListings.find((item) => item.id === decodeURIComponent(match[1]));
    if (listing) setProductDetail(listing);
  }, [page, marketListings]);

  useEffect(() => {
    if (!productDetail) return;
    const previousTitle = document.title;
    document.title = `${productDetail.title} | سوق الجامعة`;
    const values: Record<string, string> = {
      "description": productDetail.description,
      "og:title": productDetail.title,
      "og:description": `${productDetail.description} — ${formatPrice(productDetail.price)} د.ع`,
      "og:url": `${window.location.origin}/market/product/${encodeURIComponent(productDetail.id)}`,
      "og:type": productDetail.kind === "خدمة" ? "website" : "product",
      "og:image": productDetail.mediaType === "صورة" && productDetail.mediaUrl?.startsWith("http") ? productDetail.mediaUrl : `${window.location.origin}/icons/icon-512.png`,
    };
    const changed: Array<{ meta: HTMLMetaElement; created: boolean; previous: string }> = [];
    Object.entries(values).forEach(([key, content]) => {
      const attribute = key.startsWith("og:") ? "property" : "name";
      let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      const created = !meta;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, key);
        document.head.appendChild(meta);
      }
      const previous = meta.content;
      meta.content = content;
      changed.push({ meta, created, previous });
    });
    return () => {
      document.title = previousTitle;
      changed.forEach(({ meta, created, previous }) => {
        if (created) meta.remove();
        else meta.content = previous;
      });
    };
  }, [productDetail]);

  const orderPrice = useMemo(() => {
    if (!selectedService) return { base: 0, speedFee: 0, discount: 0, pointsDiscount: 0, total: 0 };
    const base = selectedService.showPrice ? Number(selectedService.price.replace(",", "")) : 0;
    const speedFee = selectedService.showPrice ? speedOptions.find((option) => option.id === speed)?.extra || 0 : 0;
    const subtotal = base + speedFee;
    const discount = appliedCoupon ? Math.min(subtotal, appliedCoupon.type === "fixed" ? appliedCoupon.value : Math.round(subtotal * Math.min(100, appliedCoupon.value) / 100)) : 0;
    const pointsDiscount = usePoints ? Math.floor(points / 100) * 1000 : 0;
    return { base, speedFee, discount, pointsDiscount, total: Math.max(0, subtotal - discount - pointsDiscount) };
  }, [selectedService, speed, appliedCoupon, usePoints, points]);

  useEffect(() => {
    const savedPoints = localStorage.getItem(`najda-points-${accountStorageId}`);
    if (savedPoints !== null) setPoints(Number(savedPoints));
    setDailyClaimed(localStorage.getItem(`najda-daily-claim-${accountStorageId}`) === new Date().toISOString().slice(0, 10));
  }, [accountStorageId]);

  useEffect(() => {
    localStorage.setItem(`najda-points-${accountStorageId}`, String(points));
    localStorage.setItem("najda-points", String(points));
  }, [points, accountStorageId]);

  useEffect(() => {
    const referral = new URLSearchParams(window.location.search).get("ref");
    if (referral && /^MNQ-[A-Z0-9]+$/.test(referral)) {
      localStorage.setItem("najda-pending-referral", referral);
    }
  }, [page]);

  useEffect(() => {
    const sectionIds = ["catalog", "templates", "market"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.1, 0.3] },
    );
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [page]);

  useEffect(() => {
    const handlePopState = () => {
      setPage(pageFromPath(window.location.pathname));
      if (!window.location.pathname.startsWith("/market/product/")) setProductDetail(null);
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigateToMarket() {
    window.history.pushState({}, "", "/market");
    setPage("market");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateHome() {
    window.history.pushState({}, "", "/");
    setPage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToProfile() {
    window.history.pushState({}, "", "/profile");
    setPage("profile");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToTemplates() {
    window.history.pushState({}, "", "/templates");
    setPage("templates");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToAdminDiscounts() {
    window.history.pushState({}, "", "/admin/discounts");
    setPage("admin-discounts");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToAdminLogin() {
    window.history.pushState({}, "", "/admin/login");
    setAuthOpen(false);
    setPage("admin-login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToAdminDashboard() {
    window.history.replaceState({}, "", "/admin/payments");
    setPage("admin-payments");
  }

  function navigateToAdminServices() {
    window.history.pushState({}, "", "/admin/services");
    setPage("admin-services");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToAdminLatex() {
    window.history.pushState({}, "", "/admin/latex");
    setPage("admin-latex");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getProductShareUrl(item: MarketListing) {
    return `${window.location.origin}/market/product/${encodeURIComponent(item.id)}`;
  }

  function openProductDetails(item: MarketListing, updateHistory = true) {
    if (updateHistory) window.history.pushState({}, "", `/market/product/${encodeURIComponent(item.id)}`);
    setProductDetail(item);
  }

  function closeProductDetails() {
    setProductDetail(null);
    if (window.location.pathname.startsWith("/market/product/")) {
      window.history.replaceState({}, "", "/market");
    }
  }

  function openShareDialog(item: MarketListing) {
    setLinkCopied(false);
    setShareItem(item);
  }

  function getShareText(item: MarketListing) {
    return `${item.title}\n${item.description}\nالسعر: ${formatPrice(item.price)} د.ع\nالبائع: ${item.seller} — ${item.location}`;
  }

  function shareExternally(channel: "whatsapp" | "telegram" | "facebook") {
    if (!shareItem) return;
    const url = getProductShareUrl(shareItem);
    const text = getShareText(shareItem);
    const targets = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
    window.open(targets[channel], "_blank", "noopener,noreferrer,width=720,height=640");
  }

  async function nativeShareProduct() {
    if (!shareItem) return;
    const shareData: ShareData = { title: shareItem.title, text: getShareText(shareItem), url: getProductShareUrl(shareItem) };
    if (shareItem.mediaUrl && navigator.canShare) {
      try {
        const response = await fetch(shareItem.mediaUrl);
        const blob = await response.blob();
        if (blob.size <= 20 * 1024 * 1024) {
          const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || (shareItem.mediaType === "فيديو" ? "mp4" : "jpg");
          const mediaFile = new File([blob], `${shareItem.id}.${extension}`, { type: blob.type });
          if (navigator.canShare({ files: [mediaFile] })) shareData.files = [mediaFile];
        }
      } catch {
        // Cross-origin media can still be shared through its public product link.
      }
    }
    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
    } else {
      shareExternally("whatsapp");
    }
  }

  async function copyProductLink() {
    if (!shareItem) return;
    await navigator.clipboard.writeText(getProductShareUrl(shareItem));
    setLinkCopied(true);
  }

  function openService(service: Service) {
    setSelectedService({
      ...service,
      templates: service.templates,
      variants: service.variants || [],
    });
    setOrderStep("details");
    setSpeed("normal");
    setCoupon("");
    setAppliedCoupon(null);
    setCouponMessage("");
    setUsePoints(false);
    document.body.style.overflow = "hidden";
  }

  function selectTemplate(template: TemplateChoice) {
    const service = template.category === "عروض تقديمية" ? services[1] : template.category === "بوسترات" ? services[3] : template.category === "سيرة ذاتية" ? {
      ...services[4],
      title: "إعداد السيرة الذاتية",
      description: "سيرة ذاتية احترافية مصممة حسب تخصصك وهدفك المهني.",
    } : template.category === "تقنية" ? {
      ...services[3],
      title: "التصاميم والواجهات التقنية",
      description: "واجهات رقمية وقوالب تقنية قابلة للتخصيص.",
    } : services[0];
    openService({
      ...service,
      templates: [
        { name: template.title, style: template.style, description: `${template.description} — ${template.id}` },
        ...(service.templates || []),
      ],
    });
  }

  async function validateCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code || !selectedService) return;
    setCouponLoading(true);
    setCouponMessage("");
    setAppliedCoupon(null);
    try {
      const response = await fetch(import.meta.env.VITE_DISCOUNT_VALIDATE_ENDPOINT || "/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal: orderPrice.base + orderPrice.speedFee,
          phone: profile?.phone || null,
          serviceId: selectedService.id,
        }),
      });
      const result = await response.json().catch(() => null) as { valid?: boolean; type?: "fixed" | "percentage"; value?: number; message?: string } | null;
      if (!response.ok || !result?.valid || !result.type || typeof result.value !== "number") {
        throw new Error(result?.message || "الكود غير صالح أو انتهى عدد استخداماته.");
      }
      setAppliedCoupon({ code, type: result.type, value: result.value });
      setCouponMessage(result.type === "percentage" ? `تم تطبيق خصم ${result.value}%` : `تم تطبيق خصم ${formatPrice(result.value)} د.ع`);
    } catch (error) {
      setCouponMessage(error instanceof Error ? error.message : "تعذر التحقق من كود الخصم.");
    } finally {
      setCouponLoading(false);
    }
  }

  function closeService() {
    setSelectedService(null);
    setOrderStep("details");
    document.body.style.overflow = "";
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService) return;
    const data = new FormData(event.currentTarget);
    const selectedSpeed = speedOptions.find((option) => option.id === speed);
    const message = [
      "مرحباً، أود تثبيت طلب جديد عبر المنقذ الجامعي",
      `الخدمة: ${selectedService.title}`,
      `الاسم الثلاثي: ${data.get("fullName")}`,
      `رقم التواصل: ${data.get("phone")}`,
      `الجامعة: ${data.get("university")}`,
      `الكلية: ${data.get("college")}`,
      `القسم: ${data.get("department")}`,
      `الأستاذ المشرف: ${data.get("supervisor") || "غير محدد"}`,
      `عنوان الموضوع: ${data.get("title")}`,
      `ملاحظات الدكتور: ${data.get("notes") || "لا توجد"}`,
      `مستوى التنفيذ: ${data.get("variant")}`,
      `القالب: ${data.get("template")}`,
      `اللون: ${data.get("color")}`,
      `التنفيذ: ${selectedSpeed?.label} – ${selectedSpeed?.detail}`,
      `كود الخصم: ${appliedCoupon?.code || "لا يوجد"}`,
      `خصم النقاط: ${usePoints ? `${orderPrice.pointsDiscount} د.ع` : "لا يوجد"}`,
      selectedService.showPrice ? `السعر التقديري: ${formatPrice(orderPrice.total)} د.ع` : "السعر النهائي يحدد بعد مراجعة تفاصيل الطلب.",
      "الاستنساخ والتوصيل إلى الجامعة: مجاناً",
      "",
      "هذا استفسار عبر واتساب ولم يُسجل كطلب في النظام بعد.",
    ].join("\n");
    setOrderStep("success");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function claimDailyPoints() {
    if (dailyClaimed) return;
    setPoints((current) => current + 15);
    setDailyClaimed(true);
    localStorage.setItem(`najda-daily-claim-${accountStorageId}`, new Date().toISOString().slice(0, 10));
  }

  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const phone = String(data.get("phone") || "").replace(/\s/g, "");

    if (authMode === "login") {
      const saved = localStorage.getItem("najda-profile");
      if (!saved) {
        setAuthError("لا يوجد حساب محفوظ على هذا الجهاز. أنشئ حساباً جديداً أولاً.");
        return;
      }
      const savedProfile = JSON.parse(saved) as StudentProfile;
      if (savedProfile.phone.replace(/\s/g, "") !== phone) {
        setAuthError("رقم الهاتف لا يطابق الحساب المحفوظ على هذا الجهاز.");
        return;
      }
      setProfile(savedProfile);
      setAuthError("");
      setAuthOpen(false);
      return;
    }

    const newProfile: StudentProfile = {
      fullName: String(data.get("fullName") || ""),
      phone,
      university: String(data.get("university") || ""),
      college: String(data.get("college") || ""),
      department: String(data.get("department") || ""),
      stage: String(data.get("stage") || ""),
      referredBy: localStorage.getItem("najda-pending-referral") || undefined,
    };
    localStorage.setItem("najda-profile", JSON.stringify(newProfile));
    setProfile(newProfile);
    setAuthError("");
    setAuthOpen(false);
  }

  function signOut() {
    setProfile(null);
    setAuthMode("login");
    setAuthOpen(true);
  }

  function openListingComposer(mode: "منتج" | "خدمة" | "ريل") {
    setListingMode(mode);
    setListingError("");
    setListingError("");
    setListingMediaName("");
    setListingOpen(true);
  }

  function submitListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setListingError("نشر الإعلانات غير متاح حتى يكتمل ربط قاعدة بيانات السوق والتخزين.");
  }

  async function startWaylCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!purchaseItem || paymentLoading) return;
    setPaymentLoading(true);
    setPaymentError("");
    const form = new FormData(event.currentTarget);
    const endpoint = import.meta.env.VITE_WAYL_CHECKOUT_ENDPOINT || "/api/payments/wayl/checkout";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: purchaseItem.id,
          customer: {
            fullName: form.get("fullName"),
            phone: form.get("phone"),
            delivery: form.get("delivery"),
          },
          returnUrl: `${window.location.origin}/market?payment=return`,
        }),
      });
      if (!response.ok) throw new Error("تعذر إنشاء عملية الدفع");
      const result = await response.json() as { checkoutUrl?: string };
      if (!result.checkoutUrl) throw new Error("لم يُرجع الخادم رابط الدفع");
      const checkoutUrl = new URL(result.checkoutUrl);
      if (checkoutUrl.protocol !== "https:") throw new Error("رابط الدفع غير آمن");
      window.location.assign(checkoutUrl.toString());
    } catch {
      setPaymentError("بوابة Wayl غير متصلة بالخادم بعد. لن يتم خصم أي مبلغ. أكمل إعداد endpoint الدفع حسب ملف fortheai.md.");
      setPaymentLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#172b43]" dir="rtl">
      {page === "market" ? (
        <MarketStorePage
          items={marketItems}
          query={marketQuery}
          category={marketCategory}
          kind={marketKind}
          onQuery={setMarketQuery}
          onCategory={setMarketCategory}
          onKind={setMarketKind}
          onBack={navigateHome}
          onPublish={openListingComposer}
          onPurchase={(item) => { setPurchaseItem(item); setPaymentError(""); }}
          onShare={openShareDialog}
          onDetails={(item) => openProductDetails(item)}
        />
      ) : page === "profile" ? (
        <ProfilePage
          profile={profile}
          points={points}
          dailyClaimed={dailyClaimed}
          orders={orders}
          onClaimDaily={claimDailyPoints}
          onBack={navigateHome}
          onEdit={() => { setAuthMode("register"); setAuthOpen(true); }}
          onLogin={() => { setAuthMode("login"); setAuthOpen(true); }}
          onSignOut={() => { signOut(); navigateHome(); }}
        />
      ) : page === "templates" ? (
        <Suspense fallback={<div className="route-loader" role="status"><span /><strong>جارٍ تحميل مكتبة القوالب...</strong><small>نجهز المعاينات والفئات</small></div>}>
          <TemplatesPage onBack={navigateHome} onSelect={selectTemplate} />
        </Suspense>
      ) : page === "admin-services" ? (
        <Suspense fallback={<div className="route-loader" role="status"><span /><strong>جارٍ تحميل إدارة الخدمات...</strong></div>}>
          <AdminServicesPage onBack={navigateHome} onPayments={navigateToAdminDashboard} onDiscounts={navigateToAdminDiscounts} onLatex={navigateToAdminLatex} />
        </Suspense>
      ) : page === "admin-login" || page === "admin-payments" ? (
        <Suspense fallback={<div className="route-loader" role="status"><span /><strong>جارٍ تحميل لوحة المشرف...</strong></div>}>
          <AdminPaymentsPage onBack={navigateHome} onDashboard={navigateToAdminDashboard} onServices={navigateToAdminServices} onDiscounts={navigateToAdminDiscounts} onLatex={navigateToAdminLatex} />
        </Suspense>
      ) : page === "admin-discounts" ? (
        <Suspense fallback={<div className="route-loader" role="status"><span /><strong>جارٍ تحميل إدارة الخصومات...</strong></div>}>
          <AdminDiscountsPage onBack={navigateHome} onLatex={navigateToAdminLatex} />
        </Suspense>
      ) : page === "admin-latex" ? (
        <Suspense fallback={<div className="route-loader" role="status"><span /><strong>جارٍ تحميل مختبر LaTeX...</strong><small>يتم تحميل أدوات الإدارة عند الحاجة فقط</small></div>}>
          <AdminLatexPage onBack={navigateHome} onDiscounts={navigateToAdminDiscounts} />
        </Suspense>
      ) : (
      <>
      <header className="sticky top-0 z-40 border-b border-[#dfe8ef] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-[1180px] items-center justify-between px-5 lg:px-8">
          <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="فتح القائمة">
            <Icon name={menuOpen ? "close" : "menu"} size={25} />
          </button>
          <a href="#" className="flex items-center gap-3" aria-label="المنقذ الجامعي">
            <span className="logo-mark"><Icon name="book" size={24} /></span>
            <span>
              <span className="block text-[20px] font-extrabold leading-5 text-[#143b63]">المنقذ الجامعي</span>
              <span className="text-[10px] font-bold tracking-[.09em] text-[#7089a0]">معك في كل خطوة</span>
            </span>
          </a>
          <nav className={`${menuOpen ? "mobile-nav" : "hidden"} lg:flex lg:items-center lg:gap-8`}>
            <a className={`nav-link ${activeSection === "catalog" ? "active" : ""}`} href="#catalog" onClick={() => setMenuOpen(false)}>الخدمات</a>
            <a className="nav-link" href="/templates" onClick={(event) => { event.preventDefault(); navigateToTemplates(); }}>القوالب</a>
            <a className={`nav-link ${activeSection === "market" ? "active" : ""}`} href="/market" onClick={(event) => { event.preventDefault(); navigateToMarket(); }}>سوق الجامعة</a>
            <a className="nav-link" href="/profile" onClick={(event) => { event.preventDefault(); navigateToProfile(); }}>حسابي ومكافآتي</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <button className="icon-button" aria-label="البحث"><Icon name="search" size={19} /></button>
            <button className="icon-button relative" aria-label="طلباتي" onClick={() => setShowOrders(true)}>
              <Icon name="receipt" size={19} />{orders.length > 0 && <span className="cart-count">{orders.length}</span>}
            </button>
            <button className="hidden items-center gap-2 rounded-xl bg-[#143b63] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0e2e4f] sm:flex" onClick={profile ? navigateToProfile : () => { setAuthMode("login"); setAuthOpen(true); }}>
              <Icon name="user" size={17} /> {profile ? profile.fullName.split(" ")[0] : "تسجيل الدخول"}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero overflow-hidden">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 py-16 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-[88px]">
            <div className="relative z-10">
              <div className="eyebrow"><Icon name="sparkles" size={15} /> كل ما يحتاجه الطالب في مكان واحد</div>
              <h1 className="mt-6 text-[43px] font-black leading-[1.25] text-[#143b63] sm:text-[58px]">
                دراستك أسهل،<br /><span className="relative text-[#e79b35]">ونجاحك أقرب<span className="title-swoosh" /></span>
              </h1>
              <p className="mt-6 max-w-xl text-[17px] leading-8 text-[#566f85]">
                خدمات جامعية احترافية تُنجز بعناية، من التقارير والعروض إلى كل ما يساعدك على التفوق في رحلتك الأكاديمية.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#services" className="primary-button">استكشف الخدمات <Icon name="arrow" size={18} /></a>
                <a href="/market" className="secondary-button" onClick={(event) => { event.preventDefault(); navigateToMarket(); }}><Icon name="store" size={19} /> تصفّح سوق الجامعة</a>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-bold text-[#526b81]">
                <span className="flex items-center gap-2"><span className="mini-check"><Icon name="check" size={12} /></span> جودة مضمونة</span>
                <span className="flex items-center gap-2"><span className="mini-check"><Icon name="check" size={12} /></span> تسليم في الموعد</span>
                <span className="flex items-center gap-2"><span className="mini-check"><Icon name="check" size={12} /></span> استنساخ وتوصيل مجاناً</span>
              </div>
            </div>

            <div className="relative mx-auto hidden h-[430px] w-full max-w-[475px] sm:block">
              <div className="hero-card main-visual">
                <div className="visual-top">
                  <span className="visual-dots"><i /><i /><i /></span>
                  <span>مشروعك القادم</span>
                </div>
                <div className="visual-content">
                  <div className="paper">
                    <div className="paper-badge"><Icon name="file" size={22} /></div>
                    <span className="paper-line wide" />
                    <span className="paper-line medium" />
                    <span className="paper-line short" />
                    <div className="paper-chart"><i /><i /><i /><i /></div>
                  </div>
                  <div className="pencil"><span /></div>
                </div>
              </div>
              <div className="decor-star star-one">✦</div>
              <div className="decor-star star-two">✦</div>
            </div>
          </div>
        </section>

        <section className="section" id="services">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="section-heading">
              <div><span className="section-kicker">خدماتنا الأكاديمية</span><h2>كل ما تحتاجه لتتميّز</h2><p>اختر الخدمة المناسبة لك ودع الباقي علينا.</p></div>
              <a href="#catalog" className="see-all">عرض جميع الخدمات <Icon name="arrow" size={17} /></a>
            </div>
            <div className="category-tabs">
              {serviceCategories.map((category) => (
                <button className={activeCategory === category ? "active" : ""} key={category} onClick={() => setActiveCategory(category)}>{category}</button>
              ))}
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visibleServices.map((service) => (
                <button className="service-card text-right" key={service.id} onClick={() => openService(service)}>
                  {service.popular && <span className="popular-badge">الأكثر طلباً</span>}
                  <span className={`service-icon ${service.color}`}><Icon name={service.icon} size={26} /></span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <div className="service-meta"><span><Icon name="clock" size={15} /> {service.duration}</span></div>
                  <div className="service-footer">
                    <span><small>{service.showPrice ? "تبدأ من" : "السعر"}</small><strong>{service.showPrice ? `${formatPrice(Number(service.price))} د.ع` : "يحدد بعد المراجعة"}</strong></span>
                    <span className="card-arrow"><Icon name="arrow" size={19} /></span>
                  </div>
                </button>
              ))}
              {!visibleServices.length && <div className="catalog-empty md:col-span-2 lg:col-span-3"><Icon name="file" size={28} /><h3>{servicesLoadError ? "تعذر تحميل الخدمات" : "لا توجد خدمات منشورة بعد"}</h3><p>{servicesLoadError || "سيضيف المشرف الخدمات وأسعارها من لوحة الإدارة."}</p></div>}
            </div>
          </div>
        </section>

        <section className="catalog-section" id="catalog">
          <div className="mx-auto max-w-[1180px] px-5 py-20 lg:px-8">
            <div className="catalog-intro">
              <div><span className="section-kicker">دليل المنقذ الجامعي</span><h2>الخدمات المنشورة</h2><p>تظهر هنا الخدمات التي أضافها المشرف واعتمد أسعارها.</p></div>
              <div className="catalog-count"><strong>{services.length}</strong><span>خدمة متاحة</span></div>
            </div>
            <div className="catalog-search">
              <Icon name="search" size={21} />
              <input
                aria-label="البحث عن خدمة"
                onChange={(event) => { setCatalogQuery(event.target.value); setCatalogLimit(12); }}
                placeholder="ماذا تحتاج اليوم؟ مثال: ترجمة، طباعة، بايثون..."
                value={catalogQuery}
              />
              {catalogQuery && <button onClick={() => setCatalogQuery("")} aria-label="مسح البحث"><Icon name="close" size={17} /></button>}
            </div>
            <div className="catalog-categories">
              <button className={catalogCategory === "الكل" ? "active" : ""} onClick={() => { setCatalogCategory("الكل"); setCatalogLimit(12); }}>
                <span><Icon name="grid" size={18} /></span><b>كل الخدمات</b><small>{services.length}</small>
              </button>
              {catalogCategories.map((category, index) => {
                const icons: IconName[] = ["file", "book", "presentation", "pen", "grid", "sparkles", "receipt", "clock", "book", "search", "presentation", "user", "store", "receipt", "star", "grid", "palette", "store", "sparkles"];
                return (
                  <button className={catalogCategory === category.name ? "active" : ""} key={category.name} onClick={() => { setCatalogCategory(category.name); setCatalogLimit(12); }}>
                    <span><Icon name={icons[index]} size={18} /></span><b>{category.name}</b><small>{category.count}</small>
                  </button>
                );
              })}
            </div>
            <div className="catalog-result-bar">
              <span>عرض <strong>{Math.min(catalogLimit, filteredCatalog.length)}</strong> من <strong>{filteredCatalog.length}</strong> خدمة</span>
              {catalogCategory !== "الكل" && <button onClick={() => setCatalogCategory("الكل")}><Icon name="close" size={14} /> إلغاء التصفية</button>}
            </div>
            {filteredCatalog.length > 0 ? (
              <>
                <div className="catalog-grid">
                  {filteredCatalog.slice(0, catalogLimit).map((service) => (
                    <button className="catalog-card" key={service.id} onClick={() => openService(service)}>
                      <span className="catalog-card-top"><i>{String(service.id).padStart(3, "0")}</i><em>{service.category}</em></span>
                      <h3>{service.title}</h3>
                      <p>{service.description}</p>
                      <span className="catalog-tags"><i><Icon name="clock" size={13} />{service.duration}</i><i><Icon name={service.delivery === "رقمي" ? "file" : "store"} size={13} />{service.delivery}</i>{service.templateGroup && <i className="has-templates"><Icon name="palette" size={13} />قوالب {service.templateGroup}</i>}</span>
                      <span className="catalog-card-footer"><span><small>{service.showPrice ? "تبدأ من" : "السعر"}</small><strong>{service.showPrice ? `${formatPrice(Number(service.price))} <i>د.ع</i>` : "يحدد بعد المراجعة"}</strong></span><b><Icon name="arrow" size={17} /></b></span>
                    </button>
                  ))}
                </div>
                {catalogLimit < filteredCatalog.length && (
                  <button className="load-more" onClick={() => setCatalogLimit((current) => current + 12)}>
                    عرض 12 خدمة إضافية <span>{filteredCatalog.length - catalogLimit} متبقية</span>
                  </button>
                )}
              </>
            ) : (
              <div className="catalog-empty">
                <span><Icon name="search" size={29} /></span><h3>لم نجد خدمة بهذا الاسم</h3><p>أرسل ما تحتاجه وسنساعدك في توفير مقدم الخدمة المناسب.</p>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`مرحباً، أبحث عن خدمة: ${catalogQuery}`)}`} target="_blank" rel="noreferrer">اطلب خدمة مخصصة عبر واتساب</a>
              </div>
            )}
            <div className="academic-note"><Icon name="shield" size={22} /><div><strong>تعلم مسؤول، لا بديل عن الطالب</strong><p>خدمات الشرح والعلوم مخصصة للفهم والتدريب والمراجعة، ولا ننفذ امتحاناً أو واجباً مقيماً بدلاً عن الطالب.</p></div></div>
          </div>
        </section>

        <section className="section bg-[#f1f5fa]" id="why">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="center-heading"><span className="section-kicker">لماذا المنقذ الجامعي؟</span><h2>خدمة تستحق ثقتك</h2><p>نهتم بالتفاصيل حتى تحصل على نتيجة تليق بطموحك.</p></div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["shield", "جودة أكاديمية", "محتوى دقيق ومراجع موثوقة وفق معايير جامعتك."],
                ["clock", "التزام بالوقت", "نُسلّم طلبك في الموعد المتفق عليه دون تأخير."],
                ["headphones", "متابعة مستمرة", "نبقى معك من لحظة الطلب وحتى اعتماد النتيجة."],
                ["sparkles", "تعديلات مرنة", "ننفذ ملاحظاتك الأكاديمية لضمان رضاك التام."],
              ].map(([icon, title, text]) => (
                <div className="feature-card" key={title}><span><Icon name={icon as IconName} size={24} /></span><h3>{title}</h3><p>{text}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="section templates-section" id="templates">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="section-heading">
              <div><span className="section-kicker">مكتبة القوالب</span><h2>القوالب المنشورة</h2><p>تظهر هنا القوالب المتاحة فعلياً في المكتبة.</p></div>
              <button className="see-all" onClick={navigateToTemplates}>استعراض المكتبة <Icon name="arrow" size={17} /></button>
            </div>
            <div className="templates-empty"><span><Icon name="file" size={24} /></span><h3>لا توجد قوالب منشورة بعد</h3><p>ستظهر القوالب هنا بعد إضافتها إلى المكتبة.</p></div>
          </div>
        </section>

        <section className="profile-teaser">
          <div className="mx-auto max-w-[1180px] px-5 py-14 lg:px-8">
            <div><span className="reward-label"><Icon name="trophy" size={16} /> نادي المنقذ</span><h2>مكافآتك وحسابك في مكان واحد</h2><p>انتقل إلى ملفك الشخصي لتسجيل الحضور اليومي، مراجعة المستوى والنقاط، وضبط الإشعارات ومشاركة رابط الإحالة الخاص بك.</p></div>
            <div className="profile-teaser-points"><span><small>رصيدك</small><strong>{points}<i> نقطة</i></strong></span><button onClick={navigateToProfile}>فتح ملفي الشخصي <Icon name="arrow" size={17} /></button></div>
          </div>
        </section>

        <section className="section" id="market">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="market-banner">
              <div><span className="section-kicker light">سوق الجامعة ومشاريع الطلبة</span><h2>كل مشروع طلابي يستحق أن يُرى</h2><p>سوق عام لمشاريع الطلبة: طعام، مكياج، أزياء، حرف، خدمات رقمية، كتب وأجهزة وأكثر. انشر منتجك أو خدمتك أو ريل قصير، ورسومنا 1,000 د.ع فقط عند نجاح البيع.</p><div className="flex flex-wrap gap-2"><button className="market-button" onClick={navigateToMarket}>دخول السوق <Icon name="arrow" size={18} /></button><button className="market-button outline" onClick={() => openListingComposer("منتج")}><Icon name="plus" size={18} /> بيع منتج</button><button className="market-button outline" onClick={() => openListingComposer("ريل")}><Icon name="play" size={18} /> انشر ريل</button></div></div>
              <div className="market-graphic"><Icon name="store" size={82} /><span className="market-bag"><Icon name="bag" size={30} /></span></div>
            </div>
            <div className="market-tools">
              <div className="market-search"><Icon name="search" size={18} /><input value={marketQuery} onChange={(event) => setMarketQuery(event.target.value)} placeholder="ابحث عن طعام، مكياج، أزياء، كتاب، جهاز أو خدمة..." />{marketQuery && <button onClick={() => setMarketQuery("")}><Icon name="close" size={15} /></button>}</div>
              <div className="market-kind"><button className={marketKind === "الكل" ? "active" : ""} onClick={() => setMarketKind("الكل")}>الكل</button><button className={marketKind === "منتج" ? "active" : ""} onClick={() => setMarketKind("منتج")}>منتجات</button><button className={marketKind === "خدمة" ? "active" : ""} onClick={() => setMarketKind("خدمة")}>خدمات</button></div>
            </div>
            <div className="market-categories">{marketCategories.map((category) => <button className={marketCategory === category ? "active" : ""} key={category} onClick={() => setMarketCategory(category)}>{category}</button>)}</div>
            <div className="mt-8 flex items-center justify-between"><div><h3 className="text-xl font-extrabold">أضيف حديثاً</h3><p className="market-result-count">{marketItems.length} إعلان مطابق</p></div><button className="see-all" onClick={() => { setMarketCategory("الكل"); setMarketKind("الكل"); setMarketQuery(""); }}>عرض الكل <Icon name="arrow" size={17} /></button></div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {marketItems.map((item) => (
                <article className="market-card" key={item.id}>
                  <div className={`product-art ${item.style}`}>
                    {item.mediaUrl && item.mediaType === "فيديو" && <video className="listing-media" src={item.mediaUrl} muted preload="metadata" playsInline />}
                    {item.mediaUrl && item.mediaType === "صورة" && <img className="listing-media" src={item.mediaUrl} alt={item.title} />}
                    {!item.mediaUrl && item.style === "calculator" && <div className="calculator-shape"><i /><span>{Array.from({ length: 15 }).map((_, i) => <b key={i} />)}</span></div>}
                    {!item.mediaUrl && item.style === "books" && <div className="book-stack"><i /><i /><i /></div>}
                    {!item.mediaUrl && item.style === "coat" && <div className="coat-shape"><i /><span /></div>}
                    {!item.mediaUrl && ["service", "housing", "general", "food", "beauty", "fashion", "handmade", "creative"].includes(item.style) && <div className="market-placeholder"><Icon name={item.kind === "خدمة" || item.style === "creative" ? "sparkles" : item.style === "housing" ? "store" : "bag"} size={38} /><span>{item.category}</span></div>}
                    <span className="item-tag">{item.tag}</span>
                    <span className="media-badge"><Icon name={item.mediaType === "فيديو" ? "play" : "file"} size={12} />{item.mediaType}</span>
                  </div>
                  <div className="p-5"><div className="market-card-meta"><span>{item.kind}</span><span>{item.category}</span></div><p className="mt-2 text-xs font-bold text-[#80938e]">{item.location} • {item.seller}</p><h4 className="mt-2 font-extrabold">{item.title}</h4><p className="market-description">{item.description}</p><div className="mt-4 flex items-center justify-between"><strong className="text-[#2474b4]">{formatPrice(item.price)} د.ع</strong><span className="market-card-actions"><button className="small-cart" aria-label={`مشاركة ${item.title}`} onClick={() => openShareDialog(item)}><Icon name="share" size={16} /></button><button className="small-cart" aria-label={item.kind === "خدمة" ? "طلب الخدمة" : "شراء المنتج"} onClick={() => { setPurchaseItem(item); setPaymentError(""); }}><Icon name={item.kind === "خدمة" ? "arrow" : "cart"} size={17} /></button></span></div></div>
                </article>
              ))}
            </div>
            {marketItems.length === 0 && <div className="market-empty"><Icon name="search" size={28} /><h3>لا توجد إعلانات مطابقة</h3><p>غيّر الفئة أو انشر طلبك ليشاهده مجتمع الجامعة.</p><button onClick={() => openListingComposer("منتج")}>أضف أول إعلان</button></div>}
            <div className="reels-heading"><div><span className="section-kicker">فيديوهات السوق</span><h3>شاهد المنتج أو الخدمة كما هي</h3></div><button onClick={() => openListingComposer("ريل")}><Icon name="plus" size={15} /> نشر ريل</button></div>
            <div className="reels-row">
              {marketReels.map((reel, index) => (
                <button className={`reel-card ${reel.style}`} key={`${reel.title}-${index}`}>
                  {"mediaUrl" in reel && reel.mediaUrl && <video className="reel-video" src={reel.mediaUrl} muted preload="metadata" playsInline />}
                  <span className="reel-play"><Icon name="play" size={20} /></span>
                  <span className="reel-overlay"><strong>{reel.title}</strong><small>{reel.createdAt}</small></span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-5 pb-20 lg:px-8">
          <div className="cta">
            <div><h2>جاهز تبدأ؟ نحن هنا لمساعدتك</h2><p>اختر خدمتك الآن، وسيكون فريقنا معك خطوة بخطوة.</p></div>
            <a href="#services" className="cta-button">اطلب خدمتك الآن <Icon name="arrow" size={18} /></a>
          </div>
        </section>
      </main>

      <footer id="contact">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-12 md:grid-cols-[1.3fr_.7fr_.7fr_1fr] lg:px-8">
          <div><div className="flex items-center gap-3"><span className="logo-mark inverse"><Icon name="book" size={22} /></span><strong className="text-xl">المنقذ الجامعي</strong></div><p className="mt-4 max-w-sm text-sm leading-7 text-[#a9bac9]">رفيق الطالب العراقي للخدمات الأكاديمية والاحتياجات الجامعية، بجودة تستحق ثقتك.</p></div>
          <div><h4>روابط سريعة</h4><a href="#services">الخدمات</a><a href="#market">سوق الجامعة</a><a href="#why">كيف نعمل؟</a></div>
          <div><h4>المساعدة</h4><a href="#">الأسئلة الشائعة</a><a href="#">سياسة الخصوصية</a><a href="#">الشروط والأحكام</a><a href="/admin/login" onClick={(event) => { event.preventDefault(); navigateToAdminLogin(); }}>دخول المشرفين</a></div>
          <div><h4>ابقَ على تواصل</h4><p className="text-sm leading-7 text-[#a9bac9]">أرسل استفسارك وسنجيبك بأقرب وقت.</p><a className="footer-contact" href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("مرحباً، أحتاج مساعدة من فريق المنقذ الجامعي")}`} target="_blank" rel="noreferrer"><Icon name="phone" size={18} /> تواصل عبر واتساب</a></div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-[#7890a5]">جميع الحقوق محفوظة © 2025 المنقذ الجامعي</div>
      </footer>

      <nav className="mobile-dock" aria-label="التنقل السريع">
        <a href="#catalog"><Icon name="grid" size={20} /><span>الخدمات</span></a>
        <a href="/templates" onClick={(event) => { event.preventDefault(); navigateToTemplates(); }}><Icon name="palette" size={20} /><span>القوالب</span></a>
        <a href="/market" onClick={(event) => { event.preventDefault(); navigateToMarket(); }}><Icon name="store" size={20} /><span>السوق</span></a>
        <button onClick={() => setShowOrders(true)}><Icon name="receipt" size={20} /><span>طلباتي</span></button>
        <button onClick={profile ? navigateToProfile : () => { setAuthMode("login"); setAuthOpen(true); }}><Icon name="user" size={20} /><span>{profile ? "حسابي" : "دخول"}</span></button>
      </nav>
      </>
      )}

      {selectedService && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeService()}>
          <div className="service-modal">
            <button className="modal-close" onClick={closeService} aria-label="إغلاق"><Icon name="close" size={20} /></button>
            {orderStep === "details" && (
              <div>
                <div className="modal-hero">
                  <span className={`service-icon large ${selectedService.color}`}><Icon name={selectedService.icon} size={31} /></span>
                  <div><span className="section-kicker">خدمة أكاديمية</span><h2>{selectedService.title}</h2><p>{selectedService.description}</p></div>
                </div>
                <div className="modal-body">
                  <h3>ماذا تشمل الخدمة؟</h3>
                  <div className="feature-list">{selectedService.features.map((feature) => <span key={feature}><i><Icon name="check" size={14} /></i>{feature}</span>)}</div>
                  <div className="service-variants">
                    <h3>اختر مستوى الخدمة</h3>
                    <div>{selectedService.variants?.map((variant, index) => <span key={variant}><i>0{index + 1}</i><b>{variant}</b></span>)}</div>
                  </div>
                  {selectedService.templates && (
                    <div className="detail-templates">
                      <div><h3>قوالب متاحة لهذه الخدمة</h3><small>يمكن تخصيص الألوان والخطوط بعد الاختيار</small></div>
                      <div>{selectedService.templates.map((template) => <span className={template.style} key={template.name}><i /><i /><b>{template.name}</b><small>{template.description}</small></span>)}</div>
                    </div>
                  )}
                  <div className="order-summary"><span><small>السعر</small><strong>{selectedService.showPrice ? `تبدأ من ${selectedService.price} د.ع` : "يحدد بعد مراجعة الطلب"}</strong></span><span><small>مدة الإنجاز</small><strong>{selectedService.duration}</strong></span></div>
                  <button className="full-button" onClick={() => setOrderStep("form")}>طلب هذه الخدمة <Icon name="arrow" size={18} /></button>
                </div>
              </div>
            )}
            {orderStep === "form" && (
              <form onSubmit={submitOrder}>
                <div className="form-heading"><button type="button" onClick={() => setOrderStep("details")}><Icon name="chevron" size={20} /></button><div><span>طلب جديد</span><h2>{selectedService.title}</h2></div></div>
                <div className="form-progress"><span className="active" /><span className="active" /><span /></div>
                <div className="modal-body form-grid">
                  <label className="field"><span>الاسم الثلاثي *</span><input name="fullName" defaultValue={profile?.fullName} required placeholder="اكتب اسمك الكامل" /></label>
                  <label className="field"><span>رقم الطالب للتواصل *</span><input name="phone" defaultValue={profile?.phone} required inputMode="tel" placeholder="07XX XXX XXXX" /></label>
                  <label className="field"><span>الجامعة *</span><input name="university" defaultValue={profile?.university} required placeholder="مثال: جامعة بغداد" /></label>
                  <label className="field"><span>الكلية *</span><input name="college" defaultValue={profile?.college} required placeholder="مثال: كلية الهندسة" /></label>
                  <label className="field"><span>القسم *</span><input name="department" defaultValue={profile?.department} required placeholder="مثال: هندسة الحاسوب" /></label>
                  <label className="field"><span>اسم الأستاذ المشرف</span><input name="supervisor" placeholder="د. ..." /></label>
                  <label className="field full"><span>عنوان التقرير / الموضوع *</span><input name="title" required placeholder="اكتب عنوان الموضوع بالتفصيل" /></label>
                  <label className="field full"><span>ملاحظات الدكتور أو المتطلبات الخاصة</span><textarea name="notes" rows={3} placeholder="أضف عدد الصفحات، المصادر المطلوبة، أو أي تعليمات أخرى..." /></label>
                  <fieldset className="full">
                    <legend>نوع ومستوى التنفيذ</legend>
                    <div className="variant-options">
                      {selectedService.variants?.map((variant, index) => <label key={variant}><input defaultChecked={index === 0} name="variant" value={variant} type="radio" /><span><b>{variant}</b><small>{index === 0 ? "الاحتياج الأساسي" : index === 1 ? "تفاصيل ومراجعة أكثر" : "حسب متطلباتك بالكامل"}</small></span></label>)}
                    </div>
                  </fieldset>
                  {selectedService.templates ? (
                    <fieldset className="full">
                      <legend>اختر قالب الخدمة</legend>
                      <div className="template-options">
                        {selectedService.templates.map((template, index) => <label key={template.name}><input defaultChecked={index === 0} name="template" value={template.name} type="radio" /><span className={`template-preview ${template.style}`}><i /><i /><i /></span><b>{template.name}</b><small>{template.description}</small></label>)}
                      </div>
                    </fieldset>
                  ) : <input name="template" type="hidden" value="لا تحتاج قالباً" />}
                  <fieldset className="full">
                    <legend>اللون المفضّل</legend>
                    <div className="color-options">{[["#246fae", "أزرق أكاديمي"], ["#5c8fc4", "أزرق سماوي"], ["#67469b", "بنفسجي"], ["#b66c2c", "برتقالي"], ["#303a47", "داكن"]].map(([color, name], index) => <label key={color} style={{ background: color }}><input defaultChecked={index === 0} name="color" value={name} type="radio" /><i><Icon name="check" size={14} /></i></label>)}</div>
                  </fieldset>
                  <fieldset className="full">
                    <legend>وقت التنفيذ</legend>
                    <div className="speed-options">
                      {speedOptions.map((option) => (
                        <label className={speed === option.id ? "selected" : ""} key={option.id}>
                          <input checked={speed === option.id} name="speed" onChange={() => setSpeed(option.id)} type="radio" value={option.id} />
                          <span><b>{option.label}</b><small>{option.detail}</small></span>
                          <strong>{option.extra ? `+${formatPrice(option.extra)} د.ع` : "بدون إضافة"}</strong>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="discount-box full">
                    <div className="coupon-row">
                      <label className="field"><span>هل لديك كود خصم؟</span><input value={coupon} onChange={(event) => { setCoupon(event.target.value.toUpperCase()); setAppliedCoupon(null); setCouponMessage(""); }} placeholder="أدخل الكود هنا" /></label>
                      <button disabled={!coupon.trim() || couponLoading} type="button" onClick={validateCoupon}>{couponLoading ? "تحقق..." : appliedCoupon ? "تم التطبيق" : "تطبيق"}</button>
                    </div>
                    {couponMessage && <p className={appliedCoupon ? "coupon-success" : "coupon-error"}>{couponMessage}</p>}
                    <label className="points-toggle">
                      <input checked={usePoints} disabled={points < 100} onChange={(event) => setUsePoints(event.target.checked)} type="checkbox" />
                      <span><Icon name="trophy" size={18} /><b>استخدام نقاطي</b><small>لديك {points} نقطة • خصم متاح {formatPrice(Math.floor(points / 100) * 1000)} د.ع</small></span>
                      <i><Icon name="check" size={13} /></i>
                    </label>
                  </div>
                  <div className="live-summary full">
                    <div><span>الخدمة</span><b>{formatPrice(orderPrice.base)} د.ع</b></div>
                    {orderPrice.speedFee > 0 && <div><span>تنفيذ أسرع</span><b>+{formatPrice(orderPrice.speedFee)} د.ع</b></div>}
                    {orderPrice.discount > 0 && <div className="saving"><span>كود الخصم</span><b>-{formatPrice(orderPrice.discount)} د.ع</b></div>}
                    {orderPrice.pointsDiscount > 0 && <div className="saving"><span>خصم النقاط</span><b>-{formatPrice(orderPrice.pointsDiscount)} د.ع</b></div>}
                    <div className="summary-total"><span>{selectedService.showPrice ? "السعر التقديري" : "السعر"}</span><strong>{selectedService.showPrice ? <>{formatPrice(orderPrice.total)} <i>د.ع</i></> : "يحدد بعد المراجعة"}</strong></div>
                    <p><Icon name="bag" size={15} /> يشمل الاستنساخ والتوصيل المجاني إلى جامعتك</p>
                  </div>
                  <button className="full-button full" type="submit">إرسال الطلب للمراجعة <Icon name="arrow" size={18} /></button>
                  <p className="form-note full"><Icon name="phone" size={15} /> ستُفتح رسالة واتساب جاهزة بكل التفاصيل. أرسل ملفاتك هناك لتثبيت الطلب.</p>
                </div>
              </form>
            )}
            {orderStep === "success" && (
              <div className="success-state"><span><Icon name="check" size={38} /></span><h2>تم فتح واتساب لإرسال الاستفسار</h2><p>لم يُسجل هذا كطلب داخل النظام. أرسل التفاصيل للفريق عبر واتساب للمتابعة.</p><div className="success-actions"><button className="full-button" onClick={closeService}>العودة إلى الخدمات</button><button className="outline-button" onClick={() => { closeService(); setShowOrders(true); }}>عرض طلباتي</button></div></div>
            )}
          </div>
        </div>
      )}

      {authOpen && (
        <div className="modal-backdrop auth-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAuthOpen(false)}>
          <div className="service-modal auth-modal">
            <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="إغلاق"><Icon name="close" size={20} /></button>
            {profile ? (
              <>
                <div className="account-cover">
                  <span className="account-avatar">{profile.fullName.trim().charAt(0)}</span>
                  <div><span>مرحباً بك</span><h2>{profile.fullName}</h2><p><Icon name="trophy" size={14} /> المستوى الفضي • {points} نقطة</p></div>
                </div>
                <div className="modal-body">
                  <div className="profile-grid">
                    <span><small>رقم التواصل</small><b>{profile.phone}</b></span>
                    <span><small>الجامعة</small><b>{profile.university}</b></span>
                    <span><small>الكلية</small><b>{profile.college}</b></span>
                    <span><small>القسم والمرحلة</small><b>{profile.department} • {profile.stage}</b></span>
                  </div>
                  <div className="account-stats"><button onClick={() => { setAuthOpen(false); setShowOrders(true); }}><strong>{orders.length}</strong><span>طلباتي</span></button><button onClick={() => { setAuthOpen(false); navigateToProfile(); }}><strong>{points}</strong><span>نقاطي</span></button><button onClick={() => { setAuthOpen(false); navigateToMarket(); }}><strong>0</strong><span>إعلاناتي</span></button></div>
                  <div className="account-actions">
                    <button onClick={() => { localStorage.removeItem("najda-profile"); setProfile(null); setAuthMode("register"); }}><Icon name="pen" size={16} /> تعديل بيانات الحساب</button>
                    <button className="signout" onClick={signOut}>تسجيل الخروج</button>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={submitAccount}>
                <div className="auth-heading">
                  <span className="logo-mark"><Icon name="book" size={24} /></span>
                  <div><span>أهلاً بك في</span><h2>المنقذ الجامعي</h2><p>احفظ بياناتك وطلباتك ونقاطك في مكان واحد.</p></div>
                </div>
                <div className="auth-tabs">
                  <button className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); }} type="button">حساب جديد</button>
                  <button className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); }} type="button">تسجيل الدخول</button>
                </div>
                <div className="modal-body form-grid auth-form">
                  {authMode === "register" ? (
                    <>
                      <label className="field full"><span>الاسم الثلاثي *</span><input autoFocus name="fullName" required placeholder="اكتب اسمك الكامل" /></label>
                      <label className="field full"><span>رقم الهاتف *</span><input inputMode="tel" name="phone" required placeholder="0770 000 0000" /></label>
                      <label className="field"><span>الجامعة *</span><input name="university" required placeholder="جامعة بغداد" /></label>
                      <label className="field"><span>الكلية *</span><input name="college" required placeholder="كلية الهندسة" /></label>
                      <label className="field"><span>القسم *</span><input name="department" required placeholder="هندسة الحاسوب" /></label>
                      <label className="field"><span>المرحلة *</span><select name="stage" required defaultValue=""><option value="" disabled>اختر المرحلة</option><option>المرحلة الأولى</option><option>المرحلة الثانية</option><option>المرحلة الثالثة</option><option>المرحلة الرابعة</option><option>المرحلة الخامسة</option><option>دراسات عليا</option></select></label>
                      <button className="full-button full" type="submit">إنشاء الحساب وحفظ البيانات</button>
                    </>
                  ) : (
                    <>
                      <div className="login-welcome full"><span><Icon name="phone" size={22} /></span><h3>أدخل رقمك للعودة إلى حسابك</h3><p>سيتم استعادة الحساب المحفوظ على هذا الجهاز.</p></div>
                      <label className="field full"><span>رقم الهاتف *</span><input autoFocus inputMode="tel" name="phone" required placeholder="0770 000 0000" /></label>
                      <button className="full-button full" type="submit">تسجيل الدخول</button>
                      <button className="admin-entry-link full" onClick={navigateToAdminLogin} type="button"><Icon name="shield" size={14} /> دخول المشرفين</button>
                    </>
                  )}
                  {authError && <p className="auth-error full">{authError}</p>}
                  <button className="guest-button full" onClick={() => setAuthOpen(false)} type="button">التصفح الآن والتسجيل لاحقاً</button>
                  <p className="privacy-note full"><Icon name="shield" size={14} /> تُستخدم بياناتك للملء التلقائي وحفظ طلباتك ونقاطك.</p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showOrders && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowOrders(false)}>
          <div className="service-modal compact-modal">
            <button className="modal-close" onClick={() => setShowOrders(false)} aria-label="إغلاق"><Icon name="close" size={20} /></button>
            <div className="panel-heading"><span className="service-icon mint"><Icon name="receipt" size={24} /></span><div><span className="section-kicker">مركز المتابعة</span><h2>طلباتي</h2><p>تابع التدقيق والدفع والاستلام من مكان واحد.</p></div></div>
            <div className="modal-body">
              {orders.length === 0 ? (
                <div className="empty-state"><Icon name="file" size={35} /><h3>لا توجد طلبات بعد</h3><p>اختر إحدى الخدمات وأكمل الاستمارة، وسيظهر طلبك هنا تلقائياً.</p><button className="full-button" onClick={() => setShowOrders(false)}>استكشف الخدمات</button></div>
              ) : (
                <div className="orders-list">
                  {orders.map((order) => (
                    <article key={order.id}>
                      <span className="order-icon"><Icon name="file" size={20} /></span>
                      <div><small>{order.id} • {order.date}</small><h3>{order.service}</h3><span className="order-status">{order.status}</span></div>
                      <strong>{formatPrice(order.total)} <i>د.ع</i></strong>
                    </article>
                  ))}
                  <div className="order-steps"><span className="done"><i><Icon name="check" size={12} /></i>استلام الطلب</span><span className="current"><i>2</i>تدقيق التفاصيل</span><span><i>3</i>الدفع والتأكيد</span><span><i>4</i>التسليم</span></div>
                  <p className="panel-note"><Icon name="phone" size={15} /> يتم تأكيد الدفع وإرسال الملفات النهائية من خلال واتساب.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {listingOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setListingOpen(false)}>
          <div className="service-modal compact-modal">
            <button className="modal-close" onClick={() => setListingOpen(false)} aria-label="إغلاق"><Icon name="close" size={20} /></button>
            <form onSubmit={submitListing}>
                <div className="panel-heading"><span className="service-icon orange"><Icon name={listingMode === "ريل" ? "play" : listingMode === "خدمة" ? "sparkles" : "plus"} size={25} /></span><div><span className="section-kicker">سوق الجامعة</span><h2>{listingMode === "ريل" ? "انشر ريل جديد" : listingMode === "خدمة" ? "أضف خدمتك" : "اعرض منتجك"}</h2><p>{listingMode === "ريل" ? "فيديو قصير يوضح المنتج أو الخدمة بصدق." : "كل التفاصيل التي يحتاجها الطالب لاتخاذ القرار."}</p></div></div>
                <div className="listing-type-tabs">
                  {(["منتج", "خدمة", "ريل"] as const).map((mode) => <button className={listingMode === mode ? "active" : ""} key={mode} onClick={() => { setListingMode(mode); setListingMediaName(""); }} type="button">{mode === "ريل" && <Icon name="play" size={13} />}{mode}</button>)}
                </div>
                <div className="modal-body form-grid">
                  <input name="kind" type="hidden" value={listingMode === "خدمة" ? "خدمة" : "منتج"} />
                  <label className="field full"><span>{listingMode === "خدمة" ? "عنوان الخدمة" : "عنوان الإعلان"} *</span><input name="title" required placeholder={listingMode === "خدمة" ? "مثال: شرح خصوصي لمادة الإحصاء" : "مثال: حاسبة علمية كاسيو"} /></label>
                  <label className="field"><span>الفئة *</span><select name="category" required defaultValue=""><option value="" disabled>اختر الفئة</option>{marketCategories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label className="field"><span>السعر بالدينار *</span><input name="price" required min="0" inputMode="numeric" type="number" placeholder="25,000" /></label>
                  {listingMode !== "خدمة" ? (
                    <label className="field"><span>حالة المنتج *</span><select name="condition" required defaultValue=""><option value="" disabled>اختر الحالة</option><option>جديد</option><option>مستعمل كالجديد</option><option>مستعمل</option></select></label>
                  ) : (
                    <label className="field"><span>وحدة التسعير *</span><select name="pricingUnit" required defaultValue=""><option value="" disabled>اختر الوحدة</option><option>سعر ثابت</option><option>للساعة</option><option>للجلسة</option><option>يبدأ من</option></select></label>
                  )}
                  <label className="field"><span>مكان التوفر *</span><input name="location" defaultValue={profile?.university} required placeholder="الجامعة أو عن بُعد" /></label>
                  <label className="field full"><span>وصف واضح *</span><textarea name="description" required rows={3} placeholder="اذكر التفاصيل، ما يشمله السعر، والحالة أو الخبرة..." /></label>
                  <label className="upload-field full"><input name="media" required type="file" accept={listingMode === "ريل" ? "video/*" : "image/*,video/*"} onChange={(event) => setListingMediaName(event.target.files?.[0]?.name || "")} /><Icon name={listingMode === "ريل" ? "play" : "plus"} size={23} /><span><b>{listingMediaName || (listingMode === "ريل" ? "اختر فيديو أو ريل" : "أضف صوراً أو فيديو")}</b><small>{listingMode === "ريل" ? "يدعم الفيديوهات القصيرة والطويلة؛ سيُرفع الملف إلى التخزين السحابي بعد ربطه" : "يمكنك رفع فيديو طويل لشرح المنتج أو المشروع بالكامل"}</small></span></label>
                  <div className="fee-note full"><Icon name="shield" size={18} /><span><b>النشر مجاني بالكامل</b><small>تُخصم رسوم 1,000 د.ع فقط بعد نجاح بيع كل قطعة.</small></span></div>
                  {listingError && <p className="payment-error full" role="alert">{listingError}</p>}
                  <button className="full-button full" type="submit">{listingMode === "ريل" ? "نشر الريل" : "نشر الإعلان"}</button>
                </div>
              </form>
          </div>
        </div>
      )}

      {productDetail && (
        <div className="modal-backdrop product-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeProductDetails()}>
          <article className="product-detail-modal">
            <button className="modal-close" onClick={closeProductDetails} aria-label="إغلاق"><Icon name="close" size={20} /></button>
            <div className={`product-detail-media ${productDetail.style}`}>
              {productDetail.mediaUrl && productDetail.mediaType === "صورة" ? (
                <img src={productDetail.mediaUrl} alt={productDetail.title} />
              ) : productDetail.mediaUrl ? (
                <video src={productDetail.mediaUrl} controls preload="metadata" playsInline />
              ) : (
                <span><Icon name={productDetail.kind === "خدمة" ? "sparkles" : "bag"} size={60} /><small>{productDetail.category}</small></span>
              )}
              <i>{productDetail.mediaType}</i>
            </div>
            <div className="product-detail-content">
              <span className="store-product-category">{productDetail.kind} • {productDetail.category}</span>
              <h1>{productDetail.title}</h1>
              <p>{productDetail.description}</p>
              <div className="product-detail-seller"><span><Icon name="user" size={20} /></span><div><b>{productDetail.seller}</b><small>{productDetail.location} • نُشر {productDetail.createdAt}</small></div></div>
              <div className="product-detail-price"><span><small>السعر</small><strong>{formatPrice(productDetail.price)} <i>د.ع</i></strong></span><em>{productDetail.tag}</em></div>
              <div className="product-detail-actions">
                <button className="product-buy" onClick={() => { setPurchaseItem(productDetail); setPaymentError(""); }}>{productDetail.kind === "خدمة" ? "اطلب الخدمة" : "الدفع عبر Wayl"} <Icon name="arrow" size={17} /></button>
                <button className="product-share" onClick={() => openShareDialog(productDetail)}><Icon name="share" size={17} /> مشاركة</button>
              </div>
              <div className="product-public-link"><Icon name="file" size={14} /><span>{getProductShareUrl(productDetail)}</span></div>
            </div>
          </article>
        </div>
      )}

      {shareItem && (
        <div className="modal-backdrop share-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShareItem(null)}>
          <section className="share-modal">
            <button className="modal-close" onClick={() => setShareItem(null)} aria-label="إغلاق"><Icon name="close" size={20} /></button>
            <div className="share-preview">
              <div className={`share-media ${shareItem.style}`}>
                {shareItem.mediaUrl && shareItem.mediaType === "صورة" ? <img src={shareItem.mediaUrl} alt={shareItem.title} /> : shareItem.mediaUrl ? <video src={shareItem.mediaUrl} muted preload="metadata" playsInline /> : <Icon name={shareItem.kind === "خدمة" ? "sparkles" : "bag"} size={37} />}
              </div>
              <div><span>{shareItem.category}</span><h2>{shareItem.title}</h2><p>{shareItem.description}</p><strong>{formatPrice(shareItem.price)} د.ع</strong></div>
            </div>
            <div className="share-content">
              <span>شارك الإعلان خارج المنقذ الجامعي</span>
              <div className="share-networks">
                <button className="whatsapp" onClick={() => shareExternally("whatsapp")}><b>W</b><span>واتساب</span></button>
                <button className="telegram" onClick={() => shareExternally("telegram")}><b>T</b><span>تلغرام</span></button>
                <button className="facebook" onClick={() => shareExternally("facebook")}><b>f</b><span>فيسبوك</span></button>
                <button className="native" onClick={nativeShareProduct}><Icon name="share" size={20} /><span>المزيد</span></button>
              </div>
              <div className="share-link"><span>{getProductShareUrl(shareItem)}</span><button onClick={copyProductLink}>{linkCopied ? <><Icon name="check" size={14} /> تم النسخ</> : "نسخ الرابط"}</button></div>
              <p><Icon name="shield" size={13} /> يتضمن الرابط عنوان المنتج والوصف والسعر ومعاينة الوسائط المتاحة.</p>
            </div>
          </section>
        </div>
      )}

      {purchaseItem && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPurchaseItem(null)}>
          <div className="service-modal compact-modal">
            <button className="modal-close" onClick={() => setPurchaseItem(null)} aria-label="إغلاق"><Icon name="close" size={20} /></button>
            <form onSubmit={startWaylCheckout}>
              <div className="panel-heading"><span className="service-icon blue"><Icon name={purchaseItem.kind === "خدمة" ? "sparkles" : "cart"} size={24} /></span><div><span className="section-kicker">{purchaseItem.kind === "خدمة" ? "طلب خدمة طلابية" : "شراء آمن"}</span><h2>{purchaseItem.title}</h2><p>المبلغ: {formatPrice(purchaseItem.price)} د.ع</p></div></div>
              <div className="modal-body form-grid">
                <label className="field"><span>الاسم الثلاثي *</span><input name="fullName" defaultValue={profile?.fullName} required placeholder="اسم المستلم" /></label>
                <label className="field"><span>رقم التواصل *</span><input name="phone" defaultValue={profile?.phone} required inputMode="tel" placeholder="07XX XXX XXXX" /></label>
                <label className="field full"><span>{purchaseItem.kind === "خدمة" ? "الجامعة وطريقة الاستفادة" : "الجامعة ومكان الاستلام"} *</span><input name="delivery" required placeholder={purchaseItem.kind === "خدمة" ? "الجامعة، التخصص، حضوري أو عن بُعد" : "الجامعة، الكلية، أقرب نقطة"} /></label>
                <div className="wayl-payment full"><span className="wayl-logo">W</span><div><b>الدفع الإلكتروني عبر Wayl</b><small>ستنتقل إلى صفحة Wayl الآمنة لإتمام الدفع، ولن تُحفظ بيانات بطاقتك لدينا.</small></div><strong>{formatPrice(purchaseItem.price)} د.ع</strong></div>
                <div className="fee-note full"><Icon name="shield" size={19} /><span><b>لن نصدر وصلاً قبل تأكيد Wayl</b><small>يؤكد الخادم عملية الدفع أولاً ثم يصدر الوصل ويحدّث الطلب تلقائيًا.</small></span></div>
                {paymentError && <p className="payment-error full">{paymentError}</p>}
                <button className="full-button wayl-button full" disabled={paymentLoading} type="submit">{paymentLoading ? "جارٍ فتح Wayl..." : "الدفع الآن عبر Wayl"} <Icon name="arrow" size={17} /></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
