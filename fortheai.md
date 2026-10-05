# مهمة Claude Code: تحويل «المنقذ الجامعي» إلى منصة إنتاج فعلية

أنت تعمل داخل مستودع تطبيق **المنقذ الجامعي**، وهو تطبيق React 19 + Vite + TypeScript + Tailwind CSS v4، عربي ويدعم RTL. الدومين النهائي هو:

```text
https://al-monqith.online
```

نفّذ المهمة كاملة على مراحل صغيرة قابلة للاختبار. لا تهدم التصميم الحالي ولا تستبدله بقالب جاهز. حافظ على اللون الأزرق الأكاديمي، سهولة اللمس، اللغة العربية، واتجاه RTL.

## قواعد أمنية غير قابلة للتفاوض

1. لا تضع أي كلمة مرور أو مفتاح API أو `service_role` أو Webhook secret في كود الواجهة أو Git.
2. رقم المشرف المصرح به يُحفظ في متغير بيئة أو جدول صلاحيات، وليس شرطًا مكتوبًا داخل React.
3. كلمة مرور المشرف التي زوّد بها صاحب المشروع سابقًا تعتبر مكشوفة ويجب تغييرها قبل الإنتاج.
4. استخدم Supabase Auth ودور `admin` داخل `app_metadata`. لا تعتمد على `localStorage` للتحقق من المشرف.
5. الواجهة لا تقرر السعر النهائي ولا نجاح الدفع. الخادم يعيد حساب السعر من قاعدة البيانات ويتحقق من إشعار بوابة الدفع.
6. فعّل RLS على كل جداول Supabase. امنع المستخدم العادي من تعديل الطلبات والأسعار والإيرادات.
7. تحقق من نوع وحجم كل ملف مرفوع. امنع HTML وملفات التنفيذ. استخدم روابط موقعة للملفات الخاصة.
8. طبّق rate limiting على تسجيل الدخول، إنشاء الدفع، Webhooks، ورفع الملفات.
9. لا تسجل كلمات المرور أو مفاتيح الدفع أو بيانات البطاقات في logs.

---

## 1. فحص المشروع وتثبيت المتطلبات

ابدأ بقراءة:

```bash
cat package.json
sed -n '1,220p' src/App.tsx
sed -n '1,220p' src/catalog.ts
cat public/manifest.webmanifest
cat public/sw.js
```

ثبّت الحزم اللازمة باستخدام pnpm:

```bash
pnpm add @supabase/supabase-js react-router-dom zod
pnpm add -D @types/node
```

إذا أنشأت خادم Node منفصلًا للدفع بدل Supabase Edge Functions:

```bash
pnpm add express helmet cors express-rate-limit pino
pnpm add -D tsx @types/express @types/cors
```

يفضّل استخدام **Supabase Edge Functions** لعمليات الدفع وWebhooks، لأن مفاتيح الدفع ستبقى في الخادم.

أنشئ ملف:

```text
.env.example
```

بالمتغيرات العامة فقط:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=https://al-monqith.online
```

الأسرار الخادمية لا تبدأ بـ `VITE_`:

```env
SUPABASE_SERVICE_ROLE_KEY=
WAYL_API_BASE_URL=
WAYL_MERCHANT_ID=
WAYL_API_KEY=
WAYL_WEBHOOK_SECRET=
ADMIN_PHONE=+9647740080310
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@al-monqith.online
```

أضف `.env*` إلى `.gitignore` مع السماح لـ `.env.example`.

---

## 2. ربط Supabase

استخدم مشروع Supabase منفصلًا للإنتاج. خزّن القيم العامة فقط في واجهة Vite. أنشئ:

```text
src/lib/supabase.ts
```

ويحتوي على `createClient` باستخدام `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY`.

### الجداول المطلوبة

أنشئ migrations داخل:

```text
supabase/migrations/
```

#### profiles

```text
id uuid PK references auth.users
phone text unique not null
full_name text not null
university text
college text
department text
stage text
points integer default 0 check points >= 0
loyalty_level text default 'bronze'
created_at timestamptz default now()
updated_at timestamptz default now()
```

#### services

```text
id uuid PK
slug text unique
title text
description text
category_id uuid
base_price_iqd integer
duration_label text
provider_type text
delivery_type text
is_active boolean default true
show_price boolean default true
supports_templates boolean default false
sort_order integer default 0
created_at / updated_at
```

#### service_categories

```text
id uuid PK
name text unique
icon text
is_active boolean default true
sort_order integer
```

#### service_variants

```text
id uuid PK
service_id uuid FK
name text
description text
price_delta_iqd integer default 0
is_active boolean default true
```

#### urgency_options

```text
id uuid PK
name text
duration_hours integer
price_delta_iqd integer
multiplier numeric nullable
is_active boolean default true
sort_order integer
```

أدخل افتراضيًا:

- اعتيادي: دون زيادة.
- سريع 48 ساعة.
- مستعجل 24 ساعة.
- مستعجل جدًا خلال ساعتين، قابل للتفعيل والتعطيل وتعديل السعر من لوحة المشرف.

#### templates

```text
id uuid PK
service_id uuid nullable
category text check in ('report','presentation','design','cv','document','technical')
name text
description text
preview_url text
file_path text
mime_type text
is_active boolean default true
sort_order integer
created_by uuid
created_at / updated_at
```

#### orders

```text
id uuid PK
order_number text unique
user_id uuid FK
service_id uuid FK
variant_id uuid nullable
template_id uuid nullable
urgency_id uuid nullable
form_data jsonb
base_price_iqd integer
urgency_fee_iqd integer
discount_iqd integer
points_discount_iqd integer
total_iqd integer
status text
payment_status text
whatsapp_sent_at timestamptz nullable
created_at / updated_at
```

الحالات المقترحة:

```text
draft
pending_review
awaiting_payment
paid
in_progress
ready
delivered
cancelled
```

#### payments

```text
id uuid PK
order_id uuid FK
provider text default 'wayl'
provider_payment_id text unique
amount_iqd integer
status text
checkout_url text
raw_response jsonb
paid_at timestamptz
created_at / updated_at
```

#### receipts

```text
id uuid PK
receipt_number text unique
order_id uuid FK
payment_id uuid FK
amount_iqd integer
issued_at timestamptz
pdf_path text
```

#### market_listings, market_media, market_orders

انقل سوق الجامعة من `localStorage` إلى قاعدة البيانات. وفّر:

- نوع الإعلان: منتج أو خدمة.
- الفئة.
- السعر ووحدة التسعير.
- الحالة والوصف والموقع.
- حالة المراجعة.
- صور وفيديوهات متعددة.
- رسوم المنصة 1,000 د.ع عند نجاح البيع فقط.
- حالات الطلب والدفع والوصل.

#### discounts وpoint_transactions

لا تعدّل رصيد النقاط مباشرة دون سجل حركة. كل إضافة أو خصم ينشئ transaction مع السبب والطلب المرتبط.

#### push_subscriptions

```text
id uuid PK
user_id uuid FK
endpoint text unique
p256dh text
auth text
created_at timestamptz
```

### RLS

- المستخدم يقرأ ويعدل ملفه الشخصي فقط.
- المستخدم يقرأ طلباته ومدفوعاته ووصولاته فقط.
- الخدمات والفئات والقوالب النشطة قراءة عامة.
- الإعلانات المنشورة قراءة عامة.
- إنشاء الإعلان للمستخدم المسجل فقط، والتعديل لصاحبه قبل البيع.
- المشرف وحده يدير الخدمات والأسعار والقوالب وحالات الطلبات.
- لا تمنح أي صلاحية مباشرة لجدول payments لتعديل الحالة من العميل.

---

## 3. دخول الطلاب

استبدل تسجيل الدخول المحلي بـ Supabase Auth.

المسار المقترح:

1. إدخال رقم الهاتف بصيغة عراقية وتحويله إلى E.164.
2. OTP عبر SMS عندما يتم ربط مزود الرسائل في Supabase.
3. بعد التحقق، أنشئ/حدّث `profiles`.
4. حمّل الملف الشخصي والنقاط والطلبات من Supabase.
5. استخدم البيانات للملء التلقائي.
6. وفر جلسة مستمرة مع refresh token.

إلى حين ربط SMS، يمكن استخدام email/password في بيئة staging فقط، ولا تدّع أن الهاتف تم التحقق منه.

---

## 4. دخول المشرفين الآمن

أنشئ مسارًا منفصلًا:

```text
/admin/login
/admin
```

لا تضع رقم المشرف أو كلمة مروره في JavaScript.

أنشئ حساب المشرف مرة واحدة من Supabase Dashboard أو سكربت خادمي محلي باستخدام رقم الهاتف الموجود في متغير `ADMIN_PHONE` وكلمة مرور قوية يدخلها المالك محليًا. عيّن:

```json
{
  "role": "admin"
}
```

داخل `app_metadata`.

في كل صفحة Admin:

1. تحقق من جلسة Supabase.
2. اجلب claims من الخادم.
3. ارفض أي مستخدم ليس `app_metadata.role === "admin"`.
4. أضف MFA للمشرف قبل الإنتاج.
5. سجل العمليات الإدارية في جدول `admin_audit_logs`.

لا تستخدم الرمز الذي ظهر في المحادثة كما هو في الإنتاج؛ اطلب تغييره لأنه لم يعد سرًا.

---

## 5. لوحة تحكم المشرف

أنشئ Dashboard سريعًا ومتجاوبًا يتضمن:

### النظرة العامة

- الإيراد الإجمالي.
- إيراد اليوم/الأسبوع/الشهر.
- عدد الطلبات.
- الطلبات بانتظار المراجعة.
- المدفوعات الناجحة والفاشلة.
- متوسط قيمة الطلب.
- الطلبات حسب الخدمة.
- رسم الإيرادات زمنيًا.

كل الأرقام من قاعدة البيانات وليست قيمًا وهمية.

### إدارة الخدمات

- إضافة خدمة.
- تعديل الخدمة.
- حذف ناعم `is_active=false`.
- تفعيل وتعطيل بطاقة.
- إخفاء أو إظهار السعر.
- تغيير السعر الأساسي.
- ترتيب البطاقات.
- إضافة/حذف فئات.
- إضافة مستويات تنفيذ.
- إدارة الخيارات والقوالب.

### إدارة الاستعجال

- تعديل رسوم 48 ساعة.
- تعديل رسوم 24 ساعة.
- إضافة وتفعيل خيار ساعتين.
- منع خيار ساعتين للخدمات التي لا يمكن تنفيذها بهذه المدة.
- إعادة حساب السعر من الخادم.

### إدارة القوالب

#### قوالب التقارير

- رفع PDF إلى Supabase Storage.
- توليد preview للصفحات الأولى في الخادم إن أمكن.
- عارض PDF آمن داخل التطبيق.
- الطالب يستطيع التنقل بين الصفحات وتحديد القالب.

#### قوالب العروض

- رفع PPTX أو PDF للملف الأصلي.
- رفع صور preview متعددة.
- عرضها في Carousel سريع يدعم اللمس والأسهم والمؤشرات.
- لا تحمل كل الصور دفعة واحدة؛ استخدم lazy loading.

### الطلبات والمدفوعات

- تغيير الحالة.
- إضافة ملاحظة داخلية.
- طلب الدفع.
- مشاهدة تفاصيل التسعير.
- إصدار/تنزيل الوصل.
- منع تعديل الطلب بعد الدفع دون سجل تدقيق.

---

## 6. تكامل Wayl للدفع

لم تُزوّد وثائق Wayl بعد. لا تخمّن أسماء endpoints أو التوقيع.

أنشئ adapter واضحًا:

```text
supabase/functions/create-payment/
supabase/functions/wayl-webhook/
supabase/functions/payment-status/
```

وواجهة TypeScript:

```ts
interface PaymentGateway {
  createCheckout(input: {
    orderId: string;
    amount: number;
    currency: "IQD";
    customerPhone: string;
    returnUrl: string;
    webhookUrl: string;
  }): Promise<{ providerPaymentId: string; checkoutUrl: string }>;

  verifyWebhook(request: Request): Promise<{
    providerPaymentId: string;
    status: "paid" | "failed" | "cancelled";
    amount: number;
  }>;
}
```

بعد أن يزود المالك Claude Code بوثائق Wayl:

1. خزّن API key وmerchant ID وwebhook secret كـSupabase secrets أو server environment.
2. اقرأ الطلب من DB داخل `create-payment`.
3. أعد حساب `total_iqd` من السعر، الاستعجال، الخصم، والنقاط.
4. أنشئ سجل payment بحالة `pending`.
5. اطلب checkout URL من Wayl.
6. أعد الرابط فقط للواجهة.
7. لا تعتبر redirect نجاحًا للدفع.
8. تحقق من توقيع Webhook حسب توثيق Wayl.
9. تحقق من المبلغ والعملة ومعرف العملية.
10. طبّق idempotency حتى لا يتكرر التأكيد.
11. حدّث payment وorder داخل transaction.
12. أنشئ receipt فريدًا وأرسل إشعارًا للطالب.

أنشئ صفحة:

```text
/payment/return
```

تعرض «جارٍ التحقق» ثم تسأل الخادم عن الحالة. لا تعرض نجاحًا قبل تأكيد Webhook أو API verification.

---

## 7. الوصولات

بعد نجاح الدفع:

- أنشئ رقم وصل غير متكرر.
- يحتوي الوصل على اسم المنصة، رقم الطلب، التاريخ، الخدمة، المبلغ، الخصم، طريقة الدفع، ومعرف العملية.
- أنشئ PDF على الخادم.
- خزّنه في bucket خاص.
- وفر رابطًا موقعًا قصير العمر.
- اجعل الطالب يراه في «طلباتي».

---

## 8. الملفات وSupabase Storage

أنشئ buckets:

```text
service-templates-public
presentation-previews-public
order-files-private
receipts-private
market-media-public
```

سياسات الرفع:

- PDF بحد أقصى مناسب، مثل 25MB للقوالب.
- صور WebP/JPEG/PNG.
- فيديو MP4/WebM بحد يحدده المالك.
- افحص MIME ولا تعتمد على امتداد الملف.
- استخدم اسمًا عشوائيًا وليس اسم الملف الأصلي.
- الملفات الخاصة بروابط موقعة فقط.

---

## 9. الإشعارات وPWA

المشروع يحتوي بالفعل على:

```text
public/manifest.webmanifest
public/sw.js
src/PwaPrompts.tsx
```

أكمل Web Push:

1. ثبّت مكتبة Web Push المناسبة في الخادم.
2. أنشئ VAPID keys مرة واحدة وخزّن private key كسر.
3. بعد موافقة المستخدم، استدعِ `pushManager.subscribe`.
4. خزّن الاشتراك في `push_subscriptions`.
5. أرسل إشعارًا عند:
   - مراجعة الطلب.
   - طلب الدفع.
   - نجاح الدفع.
   - بدء التنفيذ.
   - جاهزية التسليم.
   - رسالة أو عرض مهم، دون إزعاج أو spam.
6. وفر زرًا في الإعدادات لإيقاف الإشعارات.
7. لا تطلب الإذن تلقائيًا دون تفاعل المستخدم.

اختبر PWA عبر Chrome DevTools > Application وLighthouse.

---

## 10. تحسين UX والأداء

قسّم `src/App.tsx` الكبير إلى صفحات ومكونات:

```text
src/pages/HomePage.tsx
src/pages/CatalogPage.tsx
src/pages/MarketPage.tsx
src/pages/OrdersPage.tsx
src/pages/Admin/*
src/components/*
src/features/services/*
src/features/market/*
src/features/payments/*
```

استخدم lazy imports لصفحات السوق والإدارة والقوالب.

قواعد الأداء:

- لا تشغّل كل فيديو تلقائيًا.
- استخدم poster و`preload="metadata"`.
- أوقف الفيديو عند خروجه من الشاشة.
- استخدم pagination من قاعدة البيانات.
- استخدم صور thumbnails وWebP.
- لا تجلب 350 خدمة بكل تفاصيلها في أول تحميل.
- debounced search.
- احترم `prefers-reduced-motion`.
- حافظ على focus داخل modals وأعده للزر بعد الإغلاق.
- Escape يغلق النافذة.
- أضف `aria-current` للناف بار.
- اختبر اللمس بعرض 320px.

---

## 11. النشر على الخادم باستخدام PM2

الخادم المقترح Ubuntu 22.04 أو 24.04.

### تجهيز النظام

```bash
sudo apt update
sudo apt install -y nginx git curl ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pnpm pm2
```

أنشئ مستخدم deploy غير root:

```bash
sudo adduser deploy
sudo usermod -aG www-data deploy
```

انسخ المشروع إلى:

```text
/var/www/al-monqith
```

ثم:

```bash
cd /var/www/al-monqith
pnpm install --frozen-lockfile
pnpm build
```

لتشغيل نسخة SPA عبر PM2:

```bash
pm2 serve /var/www/al-monqith/dist 3000 --name al-monqith-web --spa
pm2 save
pm2 startup systemd
```

نفّذ أمر `pm2 startup` الناتج ثم:

```bash
sudo systemctl enable pm2-deploy
pm2 status
```

إذا وُجد API Node:

```text
ecosystem.config.cjs
```

وشغله cluster mode مع health check. لا تشغل مفاتيح الدفع في frontend process.

### Nginx

أنشئ:

```text
/etc/nginx/sites-available/al-monqith.online
```

بإعداد reverse proxy إلى `127.0.0.1:3000`، مع:

- HTTP/2 أو HTTP/3 حسب البيئة.
- ضغط gzip/brotli إن توفر.
- cache طويل للملفات ذات hash.
- `no-cache` لـ`index.html` و`sw.js`.
- تمرير `/` إلى PM2.
- security headers دون كسر Supabase وWayl.
- حد رفع مناسب للقوالب إذا مر الرفع عبر الخادم.

فعّل الموقع:

```bash
sudo ln -s /etc/nginx/sites-available/al-monqith.online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 12. ربط Cloudflare والدومين

في Cloudflare:

1. أضف `al-monqith.online`.
2. غيّر nameservers لدى مسجل النطاق إلى القيم التي يعطيها Cloudflare.
3. أنشئ سجل:

```text
A  @    SERVER_PUBLIC_IP   Proxied
CNAME www @               Proxied
```

4. اجعل SSL/TLS على **Full (strict)**.
5. استخدم Cloudflare Origin Certificate على Nginx أو Let’s Encrypt.
6. فعّل Always Use HTTPS.
7. فعّل Brotli.
8. لا تستخدم Cache Everything على API أو Webhooks.
9. أنشئ Cache Rule للأصول:

```text
/assets/*
/icons/*
```

10. استثنِ:

```text
/sw.js
/admin/*
/api/*
/payment/*
```

11. حدّد WAF/rate limit لمسارات login وpayment وwebhook.
12. Webhook الخاص بـWayl يجب أن يصل إلى الخادم دون JavaScript challenge.

بديل أكثر أمانًا: Cloudflare Tunnel بدل فتح 80/443 مباشرة. عند استخدام Tunnel، أنشئ خدمة systemd لـ`cloudflared` ووجّه hostname إلى `http://localhost:3000`.

---

## 13. CI/CD والتشغيل الدائم

أنشئ سكربت deploy:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/al-monqith
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
pm2 reload al-monqith-web
```

لا تنفذ deploy إذا فشل build أو الاختبارات.

فعّل:

- `pm2 save`.
- startup systemd.
- log rotation: `pm2 install pm2-logrotate`.
- مراقبة disk وmemory.
- Supabase backups.
- uptime monitor يطلب `/`.
- تنبيه عند فشل Webhook أو الدفع.

---

## 14. اختبارات القبول

قبل اعتبار المهمة منتهية:

1. طالب جديد يسجل ويستعيد جلسته.
2. بياناته تملأ نموذج الطلب.
3. السعر يحسب في الخادم.
4. خيار الساعتين يظهر فقط عند تفعيله.
5. الخصم والنقاط لا يجعلان السعر سالبًا.
6. لا يستطيع العميل تغيير المبلغ عبر DevTools.
7. الدفع الوهمي لا يغيّر الطلب إلى paid.
8. Webhook صحيح يؤكد الدفع مرة واحدة.
9. يصدر وصل قابل للتنزيل.
10. المشرف يستطيع تعطيل بطاقة وإخفاء سعر.
11. المستخدم العادي لا يصل إلى `/admin`.
12. PDF القالب قابل للتصفح والاختيار.
13. Carousel العروض يعمل باللمس ولوحة المفاتيح.
14. PWA قابلة للتثبيت.
15. الإشعارات تعمل بعد موافقة المستخدم.
16. إعادة تشغيل الخادم لا توقف الموقع؛ PM2 يعيده تلقائيًا.
17. `https://al-monqith.online` يعمل عبر Cloudflare وSSL strict.
18. شغّل:

```bash
pnpm build
```

وأصلح كل خطأ قبل النشر.

## النتيجة المطلوبة

سلّم منصة فعلية وليست محاكاة: Supabase مصدر الحقيقة، Admin محمي، السعر محسوب خادميًا، الدفع موثّق عبر Wayl بعد توفير وثائقه، الملفات مخزنة بأمان، الوصولات حقيقية، PWA قابلة للتثبيت، والدومين يعمل 24/7 خلف Cloudflare وPM2.

---

## 15. خدمة LaTeX السحابية المعزولة

أضيفت إلى الواجهة صفحة:

```text
/admin/latex
```

وتتوقع endpoint للمصادقة:

```text
POST /api/admin/login
```

وendpoint للتجميع:

```text
POST /api/latex/compile
Content-Type: multipart/form-data
Authorization: Bearer <admin-access-token>
```

الحقول:

```text
source      مصدر LaTeX، بحد أقصى 1MB
compiler    xelatex | pdflatex | lualatex
mainFile    اسم الملف الرئيسي، افتراضي main.tex
assets      ملفات متعددة: tex,bib,sty,cls,png,jpg,pdf,csv,zip
```

يمكن للخادم إعادة PDF مباشرة:

```text
Content-Type: application/pdf
```

أو JSON:

```json
{
  "jobId": "latex_...",
  "pdfUrl": "https://signed-url/output.pdf",
  "logs": "Compilation completed",
  "durationMs": 3400
}
```

### البنية المطلوبة

لا تشغّل LaTeX داخل عملية API الرئيسية. استخدم:

```text
Frontend
  -> HTTPS API
  -> Auth + validation
  -> Job queue
  -> Dedicated LaTeX worker
  -> One disposable Docker container per compile
  -> Private object storage
  -> Signed PDF URL
```

للإنتاج المتوسط استخدم Redis + BullMQ أو نظام queue مكافئ. للنسخة الأولى محدودة الاستخدام يمكن تشغيل worker مستقل يستقبل job من قاعدة البيانات، لكن لا تنفذ `docker run` من request handler العام مباشرة.

### صورة TeX Live

ابدأ بصورة موثوقة وثبّت نسخة محددة بدل `latest`:

```bash
docker pull texlive/texlive:latest
docker inspect texlive/texlive:latest --format='{{index .RepoDigests 0}}'
```

بعد الاختبار، ضع digest في إعداد العامل:

```text
texlive/texlive@sha256:...
```

الأفضل بناء صورة خاصة:

```dockerfile
FROM texlive/texlive@sha256:PIN_THE_TESTED_DIGEST

RUN useradd --create-home --uid 10001 latexuser

# ثبّت الخطوط العربية المطلوبة حسب ترخيصها.
# أمثلة مفتوحة: Amiri, Noto Naskh Arabic, Noto Sans Arabic.

USER 10001:10001
WORKDIR /work
```

لا تثبّت تحديثات غير محددة أثناء كل compile.

### أمر التجميع

لا تسمح للمستخدم بإرسال command حر. حوّل قيمة compiler عبر allowlist:

```text
pdflatex -> latexmk -pdf
xelatex  -> latexmk -xelatex
lualatex -> latexmk -lualatex
```

مثال داخل الحاوية:

```bash
latexmk \
  -interaction=nonstopmode \
  -halt-on-error \
  -file-line-error \
  -no-shell-escape \
  -xelatex \
  main.tex
```

استخدم `biber` فقط عندما يحتاج المشروع لذلك، من خلال `latexmk` وليس command قادم من العميل.

### عزل Docker الإجباري

شغّل كل عملية في حاوية جديدة بهذه القيود أو ما يعادلها:

```bash
docker run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --pids-limit 128 \
  --memory 768m \
  --memory-swap 768m \
  --cpus 1.0 \
  --user 10001:10001 \
  --tmpfs /tmp:rw,noexec,nosuid,size=128m \
  --mount type=bind,src="$JOB_DIR",dst=/work,rw \
  --workdir /work \
  TEX_IMAGE \
  timeout --signal=KILL 60s \
  latexmk -interaction=nonstopmode -halt-on-error -file-line-error -no-shell-escape -xelatex main.tex
```

ملاحظات:

1. لا تستخدم `--privileged`.
2. لا تمرر Docker socket إلى API العام.
3. لا تسمح بالشبكة داخل compile.
4. لا تستخدم `--shell-escape`.
5. استخدم AppArmor أو seccomp profile مقيدًا.
6. مجلد job عشوائي لا يعتمد على اسم المستخدم.
7. احذف المجلد والحاوية في `finally` حتى عند timeout.
8. حدد عدد compiles المتزامنة حسب CPU/RAM.
9. ضع quota يومي لكل مشرف/حساب.

### استقبال ZIP والملفات

قبل فك ZIP:

- ارفض absolute paths.
- ارفض `..` وpath traversal.
- ارفض symlinks وhardlinks.
- حدد عدد الملفات، مثل 100.
- حدد الحجم المضغوط، مثل 50MB.
- حدد الحجم بعد الفك، مثل 200MB.
- ارفض nested archives أو ضع حد عمق.
- نظّف أسماء الملفات.
- لا تسمح بالكتابة خارج job directory.

تحقق من MIME الفعلي للصور وPDF. لا تقبل ملفات تنفيذ أو shared libraries.

### حماية LaTeX

افحص المصدر مبدئيًا وارفض أو قيّد الأوامر الخطرة، مع العلم أن الفحص النصي ليس بديلًا عن sandbox:

```text
\write18
\input|-
\openin لمسارات النظام
\openout خارج مجلد العمل
\usepackage يجلب ملفات غير متوفرة
```

لا تسمح بقراءة:

```text
/etc
/proc
/sys
/root
environment variables
cloud metadata
```

العزل، `--network none`، المستخدم غير root، و`--no-shell-escape` هي الحماية الأساسية.

### خدمة API

نفّذ validation باستخدام Zod:

```ts
const CompileSchema = z.object({
  compiler: z.enum(["xelatex", "pdflatex", "lualatex"]),
  mainFile: z.string().regex(/^[a-zA-Z0-9._-]+\.tex$/),
  source: z.string().min(1).max(1_000_000),
});
```

قبل إنشاء job:

1. تحقق من Supabase JWT.
2. تحقق من `app_metadata.role === "admin"`.
3. طبّق rate limit.
4. افحص الأحجام والامتدادات.
5. أنشئ job ID عشوائيًا.
6. خزّن الملفات في مجلد مؤقت بصلاحيات ضيقة.
7. أرسل job للعامل.

### حالة jobs

أنشئ جدول:

```text
latex_jobs
```

بالحقول:

```text
id uuid PK
user_id uuid
compiler text
main_file text
status queued|running|succeeded|failed|timeout
source_hash text
input_storage_path text nullable
output_storage_path text nullable
sanitized_log text
duration_ms integer
created_at
started_at
finished_at
expires_at
```

لا تخزن مصدر تقارير حساسة دون حاجة. وفر خيار حذف فوري، وسياسة retention قصيرة مثل 24 ساعة للملفات المؤقتة.

### PDF والسجل

بعد نجاح التجميع:

1. تأكد أن `main.pdf` ملف عادي وليس symlink.
2. تحقق من magic bytes `%PDF-`.
3. ضع حدًا لحجم الناتج.
4. ارفع إلى bucket خاص مثل `latex-output-private`.
5. أعد signed URL قصير العمر.
6. نظّف log من absolute paths وبيانات الخادم.
7. لا تعِد ملفات `.aux` أو `.log` الخام إلا بعد التنظيف.

### دعم العربية

صورة العامل يجب أن تحتوي على:

- XeLaTeX.
- LuaLaTeX.
- latexmk.
- biber.
- polyglossia.
- fontspec.
- bidi.
- خطوط عربية مفتوحة ومثبتة داخل الصورة.

اختبر قالبًا عربيًا يستخدم:

```latex
\usepackage{fontspec}
\usepackage{polyglossia}
\setdefaultlanguage{arabic}
\newfontfamily\arabicfont[Script=Arabic]{Amiri}
```

### PM2 والعامل

شغّل API والعامل كعمليتين منفصلتين:

```text
al-monqith-api
al-monqith-latex-worker
```

مثال:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

العامل فقط هو الذي يملك صلاحية تشغيل Docker. لا تجعل مستخدم Nginx أو تطبيق الويب عضوًا في مجموعة docker. الأفضل daemon/worker داخلي محدود بواجهة queue.

راقب:

- queue depth.
- متوسط وقت compile.
- timeout rate.
- container failures.
- مساحة `/tmp`.
- مساحة Docker.
- محاولات رفع الملفات المرفوضة.

نفّذ تنظيفًا دوريًا:

```bash
docker container prune --filter "until=1h"
docker image prune --filter "until=168h"
```

لا تستخدم prune عشوائيًا إن كانت هناك صور أو حاويات أخرى مهمة.

### Nginx وCloudflare

لـ`/api/latex/compile`:

- ارفع `client_max_body_size` بما يناسب الحد المعتمد.
- اجعل timeout أكبر قليلًا من compile timeout، مثل 90 ثانية.
- لا تستخدم Cloudflare cache.
- طبّق WAF وrate limiting دون منع multipart.
- لا تعرض endpoint للعامة دون مصادقة.

إذا أصبحت compiles طويلة، الأفضل:

```text
POST /api/latex/jobs -> 202 + jobId
GET /api/latex/jobs/:id
```

بدل إبقاء اتصال HTTP مفتوحًا.

### اختبارات LaTeX المطلوبة

1. تقرير عربي بـXeLaTeX.
2. تقرير إنجليزي بـPDFLaTeX.
3. Beamer.
4. BibTeX/Biber.
5. صورة مرفقة.
6. ZIP متعدد الملفات.
7. خطأ syntax يعيد log واضحًا.
8. infinite loop يصل إلى timeout.
9. `\write18` لا يعمل.
10. محاولة قراءة `/etc/passwd` تفشل.
11. محاولة اتصال شبكي تفشل.
12. zip bomb مرفوض.
13. مستخدم غير admin يحصل على 403.
14. PDF الناتج يعرض وينزل من صفحة `/admin/latex`.

---

## 16. روابط مشاركة منتجات سوق الجامعة وOpen Graph

الواجهة تنشئ رابطًا عامًا لكل إعلان:

```text
https://al-monqith.online/market/product/<listing-id>
```

وتحدّث metadata في المتصفح، لكن واتساب وفيسبوك وتلغرام غالبًا لا ينفذون JavaScript عند إنشاء معاينة الرابط. لذلك يجب أن يولّد الخادم HTML أوليًا خاصًا بكل منتج.

### المسار المطلوب

اجعل Nginx أو خادم Node يوجّه:

```text
GET /market/product/:id
```

إلى handler يقوم بالآتي:

1. يتحقق أن ID صالح.
2. يجلب الإعلان المنشور فقط من Supabase.
3. يرفض الإعلانات المحذوفة أو غير المعتمدة.
4. ينظف النص من HTML.
5. يختار أول صورة عامة كصورة مشاركة.
6. يولد HTML يحتوي Open Graph وTwitter Card.
7. يحمل ملفات Vite نفسها بعد metadata لكي يفتح React صفحة التفاصيل.

### Metadata المطلوبة

```html
<title>اسم المنتج | سوق الجامعة</title>
<meta name="description" content="وصف مختصر وآمن">

<meta property="og:type" content="product">
<meta property="og:site_name" content="المنقذ الجامعي">
<meta property="og:locale" content="ar_IQ">
<meta property="og:title" content="اسم المنتج">
<meta property="og:description" content="الوصف — السعر د.ع">
<meta property="og:url" content="https://al-monqith.online/market/product/ID">
<meta property="og:image" content="https://PUBLIC_IMAGE_URL">
<meta property="og:image:secure_url" content="https://PUBLIC_IMAGE_URL">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="اسم المنتج">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="اسم المنتج">
<meta name="twitter:description" content="الوصف">
<meta name="twitter:image" content="https://PUBLIC_IMAGE_URL">
```

إذا كان الإعلان فيديو، استخدم صورة poster محسنة كـ`og:image`. يمكن إضافة:

```html
<meta property="og:video" content="https://PUBLIC_VIDEO_URL">
<meta property="og:video:type" content="video/mp4">
```

لكن لا تعتمد على تشغيل الفيديو داخل كل شبكة؛ صورة الغلاف إلزامية.

### الصور

- أنشئ thumbnail مشاركة بنسبة 1.91:1 ودقة 1200×630.
- استخدم WebP للواجهة وJPEG/PNG متوافقًا لمعاينات الشبكات.
- اجعل URL مطلقًا وHTTPS ومتاحًا للـcrawler.
- لا تستخدم blob URLs أو signed URLs قصيرة جدًا في Open Graph.
- وفر صورة fallback تحمل شعار المنقذ الجامعي والفئة إذا لم يرفع المستخدم صورة.

### API الإعلان

أنشئ endpoint:

```text
GET /api/market/listings/:id
```

يعيد الحقول العامة فقط:

```json
{
  "id": "...",
  "title": "...",
  "description": "...",
  "price": 25000,
  "category": "...",
  "kind": "product",
  "condition": "...",
  "sellerDisplayName": "...",
  "location": "...",
  "media": [
    {
      "type": "image",
      "url": "https://...",
      "thumbnailUrl": "https://..."
    }
  ]
}
```

لا تعِد رقم البائع الخاص أو بياناته الحساسة.

### أزرار المشاركة

الواجهة مجهزة حاليًا لـ:

```text
WhatsApp
Telegram
Facebook
Web Share API
Copy Link
```

رسالة المشاركة تتضمن الاسم والوصف والسعر والبائع والموقع والرابط. حافظ على URL ثابت حتى عند تعديل العنوان.

### Cloudflare

- اسمح للـsocial crawlers بالوصول إلى مسارات المنتجات.
- لا تعرض JavaScript Challenge لمسار `/market/product/*`.
- Cache HTML المنتج مدة قصيرة مثل 5 دقائق.
- امسح cache عند تعديل الإعلان أو تعطيله.
- Cache الصور العامة مدة طويلة مع أسماء versioned.

### اختبار المعاينات

اختبر رابط منتج حقيقي عبر:

- Facebook Sharing Debugger.
- Telegram.
- WhatsApp على Android وiOS.
- LinkedIn Post Inspector إذا أضيف لاحقًا.
- `curl` مع User-Agent خاص بالزاحف للتأكد أن metadata موجودة في HTML قبل تشغيل JavaScript.

مثال:

```bash
curl -A "facebookexternalhit/1.1" \
  https://al-monqith.online/market/product/PRODUCT_ID
```

---

## 17. إدارة أكواد الخصم ومكتبة القوالب

الواجهة تحتوي الآن على:

```text
/templates
/admin/discounts
```

### API إدارة الخصومات

المشرف المصادق فقط يستطيع استخدام:

```text
GET    /api/admin/discounts
POST   /api/admin/discounts
PATCH  /api/admin/discounts/:id
DELETE /api/admin/discounts/:id
```

التحقق العام للطالب:

```text
POST /api/discounts/validate
```

الطلب:

```json
{
  "code": "STUDENT25",
  "subtotal": 25000,
  "phone": "07...",
  "serviceId": "..."
}
```

الاستجابة:

```json
{
  "valid": true,
  "type": "percentage",
  "value": 25,
  "message": "تم تطبيق الخصم"
}
```

أنشئ جدول `discount_codes`:

```text
id uuid PK
code text unique not null
type text check in ('fixed','percentage')
value integer not null
usage_limit integer nullable
used_count integer default 0
is_active boolean default true
starts_at timestamptz nullable
expires_at timestamptz nullable
created_by uuid
created_at / updated_at
```

القواعد:

- `usage_limit = null` يعني غير محدود.
- النسبة بين 1 و100.
- الخصم الثابت بالدينار العراقي وأكبر من صفر.
- لا يتجاوز الخصم subtotal.
- لا يصبح الإجمالي سالبًا.
- كود 100% ينتج طلبًا مجانيًا موثقًا ولا يرسل المستخدم إلى Wayl.
- التحقق لا يزيد `used_count`.
- زد `used_count` ذريًا فقط عند تثبيت الطلب أو نجاح الشرط التجاري المحدد.
- استخدم transaction أو RPC بقفل صف لمنع تجاوز حد الاستخدام عند الطلبات المتزامنة.
- أنشئ جدول `discount_redemptions` لمنع العد المكرر وربط الاستخدام بالمستخدم والطلب.
- لا تثق بقيمة الخصم المحسوبة في React؛ أعد الحساب في الخادم.

### القوالب

اجلب محتوى `/templates` من جدول `templates` بدل البيانات الثابتة، مع pagination وفئات:

```text
reports
presentations
posters
cv
documents
technical
```

للتقارير:

- PDF عام للمعاينة أو signed URL حسب الملكية.
- thumbnail للغلاف.
- عدد الصفحات.

للعروض:

- صور preview متعددة مرتبة.
- ملف PPTX الأصلي خاص ولا ينزل إلا وفق الطلب.
- Carousel يستخدم thumbnails ولا يحمل الملف الكامل.

عند اختيار قالب، أرسل `template_id` مع الطلب ولا تعتمد على الاسم فقط.

---

## 18. ربط Wayl عبر WordPress وWooCommerce

المعلومات المتوفرة حاليًا تشير إلى أن Wayl يأتي كإضافة دفع لـWooCommerce، وليس SDK مباشرًا لتطبيق React. لذلك لا تثبّت الإضافة داخل مشروع Vite، بل استخدم WordPress/WooCommerce كطبقة Checkout خلفية.

البنية المطلوبة:

```text
تطبيق المنقذ الجامعي React
        |
        | POST /api/payments/wayl/checkout
        v
Backend المنقذ الجامعي
        |
        | WooCommerce REST API
        v
WordPress + WooCommerce
        |
        | Wayl Checkout Plugin
        v
صفحة الدفع الرسمية الخاصة بـWayl
```

### تثبيت إضافة Wayl

على خادم WordPress:

1. ارفع ملفات الإضافة إلى:

```text
/wp-content/plugins/wayl-checkout/
```

أو ثبّتها من لوحة إدارة WordPress إذا كانت متوفرة كملف ZIP.

2. فعّل الإضافة من:

```text
Plugins > Installed Plugins
```

3. افتح:

```text
WooCommerce > Settings > Payments > Wayl
```

4. أدخل API Key الخاص بـWayl داخل إعدادات WordPress فقط.

5. اضبط اللغة:

```text
Arabic
```

أو اللغة المطلوبة حسب بيئة التشغيل.

6. اضبط العملة:

```text
IQD
```

ويمكن استخدام USD فقط إذا كان الحساب والتوثيق يدعمان ذلك. المنقذ الجامعي يعتمد IQD افتراضيًا.

7. احفظ الإعدادات.

8. فعّل Test Mode إن كان متاحًا، واختبر معاملة كاملة قبل الإنتاج.

### الدومين المقترح

شغّل WordPress وWooCommerce على نطاق دفع منفصل:

```text
https://pay.al-monqith.online
```

لا تعرض لوحة WordPress على نطاق التطبيق الرئيسي إن لم تكن هناك حاجة.

في Cloudflare:

```text
A أو CNAME  pay  -> خادم WordPress
Proxy: Enabled
SSL/TLS: Full (strict)
```

استثنِ صفحات الدفع وWebhooks من Cache وJavaScript Challenge:

```text
/checkout/*
/wc-api/*
/wp-json/wc/*
/?wc-api=*
```

لا تستخدم `Cache Everything` على WooCommerce.

### إعداد WooCommerce REST API

أنشئ WooCommerce REST API key بحساب خدمة محدود الصلاحيات:

```text
WooCommerce > Settings > Advanced > REST API
```

خزّن القيم في الخادم فقط:

```env
WOOCOMMERCE_BASE_URL=https://pay.al-monqith.online
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_WAYL_GATEWAY_ID=
WOOCOMMERCE_WEBHOOK_SECRET=
```

لا تبدأ هذه المتغيرات بـ`VITE_`.

لا تضع Consumer Secret أو Wayl API Key في React أو Git أو استجابة API.

### تحديد معرف بوابة Wayl

لا تخمّن قيمة `payment_method`.

بعد تثبيت الإضافة:

1. افحص إعدادات WooCommerce أو source الإضافة.
2. حدد gateway ID الحقيقي المسجل بواسطة الإضافة.
3. خزّنه في:

```env
WOOCOMMERCE_WAYL_GATEWAY_ID=
```

أمثلة مثل `wayl` أو `wayl_checkout` ليست مؤكدة ويجب عدم استخدامها قبل التحقق.

### endpoint إنشاء Checkout

الواجهة الحالية تتوقع:

```text
POST /api/payments/wayl/checkout
```

الطلب القادم من React يحتوي فقط على معرف المنتج أو الطلب وبيانات العميل. لا تثق بأي مبلغ قادم من المتصفح.

داخل الخادم:

1. تحقق من جلسة المستخدم.
2. اقرأ الطلب أو الإعلان من Supabase.
3. اقرأ السعر من قاعدة البيانات.
4. أعد حساب:
   - السعر الأساسي.
   - رسوم الاستعجال.
   - كود الخصم.
   - خصم النقاط.
   - رسوم السوق إن كانت مطبقة.
5. ثبّت total النهائي في قاعدة البيانات.
6. أنشئ WooCommerce Order عبر REST API.
7. استخدم IQD.
8. أضف line item يحمل اسم الخدمة أو المنتج.
9. أضف metadata تربط WooCommerce Order بـ:
   - Supabase order ID.
   - رقم طلب المنقذ الجامعي.
   - user ID.
10. عيّن Wayl كطريقة الدفع باستخدام gateway ID الحقيقي.
11. احصل على رابط `payment_url` أو رابط `order-pay`.
12. خزّن WooCommerce order ID في جدول payments.
13. أعد رابط Checkout فقط:

```json
{
  "checkoutUrl": "https://pay.al-monqith.online/checkout/order-pay/123/?pay_for_order=true&key=wc_order_..."
}
```

### إنشاء طلب WooCommerce

استخدم WooCommerce REST API من الخادم، وليس من المتصفح.

تصور الطلب:

```json
{
  "payment_method": "REAL_WAYL_GATEWAY_ID",
  "payment_method_title": "Wayl",
  "set_paid": false,
  "currency": "IQD",
  "billing": {
    "first_name": "Student Name",
    "phone": "07XXXXXXXXX"
  },
  "line_items": [
    {
      "product_id": 123,
      "quantity": 1,
      "subtotal": "25000",
      "total": "25000"
    }
  ],
  "meta_data": [
    {
      "key": "al_monqith_order_id",
      "value": "SUPABASE_ORDER_UUID"
    }
  ]
}
```

ملاحظة: قد يمنع WooCommerce تعيين سعر عشوائي على product عادي حسب الإعدادات. عندها:

- أنشئ hidden virtual product مخصصًا للخدمات.
- أو أنشئ إضافة bridge صغيرة موثوقة تضيف line item بالسعر المحسوب خادميًا.
- لا تسمح للعميل بإرسال السعر إلى WordPress مباشرة.

### إضافة Bridge اختيارية

إذا لم تكن WooCommerce REST API كافية، أنشئ إضافة WordPress صغيرة:

```text
al-monqith-wayl-bridge
```

وظيفتها:

- endpoint داخلي مصادق بتوقيع HMAC.
- استقبال order ID وليس السعر الخام من المتصفح.
- التحقق من الطلب مع Backend المنقذ.
- إنشاء WooCommerce Order.
- اختيار Wayl.
- إعادة payment URL.
- إرسال نتيجة الدفع إلى Backend المنقذ.

لا تجعل endpoint عامًا بلا توقيع أو allowlist.

### تأكيد الدفع

لا تعتبر redirect من Wayl نجاحًا.

أنشئ WooCommerce Webhook عند تغير حالة الطلب:

```text
order.created
order.updated
```

أو استخدم webhook/callback الخاص بإضافة Wayl إذا كان موثقًا.

الحالات المهمة:

```text
pending
on-hold
processing
completed
failed
cancelled
refunded
```

أرسل Webhook إلى:

```text
POST https://api.al-monqith.online/api/webhooks/woocommerce
```

الخادم يجب أن:

1. يقرأ raw request body.
2. يتحقق من توقيع `X-WC-Webhook-Signature` باستخدام secret.
3. يطبق idempotency باستخدام WooCommerce event/order ID.
4. يطابق المبلغ والعملة.
5. يطابق `al_monqith_order_id`.
6. يحدّث payment وorder داخل transaction.
7. يصدر الوصل بعد نجاح الدفع فقط.
8. يرسل إشعارًا للطالب.

خريطة الحالات المقترحة:

```text
processing/completed -> paid
failed               -> failed
cancelled            -> cancelled
refunded             -> refunded
pending/on-hold       -> pending
```

### صفحة الرجوع

اضبط return URL إلى:

```text
https://al-monqith.online/market?payment=return
```

أو:

```text
https://al-monqith.online/payment/return
```

صفحة الرجوع تعرض:

```text
جارٍ التحقق من الدفع...
```

ثم تستدعي Backend للتحقق من payment status. لا تعرض «تم الدفع» اعتمادًا على query parameters فقط.

### Webhooks داخل Cloudflare

استثنِ:

```text
/api/webhooks/woocommerce
```

من:

- Cache.
- Browser Integrity Check إذا سبب مشكلة.
- Managed Challenge.
- JavaScript Challenge.

طبّق rate limit مدروسًا ولا تمنع IPs الخاصة بـWooCommerce/Wayl إن كانت موثقة.

تحقق من التوقيع دائمًا حتى لو استخدمت IP allowlist.

### تشديد WordPress

- استخدم PHP وإصدارات WordPress/WooCommerce المدعومة.
- حدّث Wayl plugin بعد اختبار staging.
- عطّل XML-RPC إن لم يكن مطلوبًا.
- فعّل 2FA لحسابات المشرفين.
- لا تستخدم حساب admin باسم `admin`.
- استخدم كلمات مرور قوية.
- امنع تعديل ملفات الإضافات من لوحة الإدارة:

```php
define('DISALLOW_FILE_EDIT', true);
```

- استخدم أقل صلاحيات ممكنة لـREST API key.
- احتفظ بنسخ احتياطية لقاعدة WordPress.
- راقب الطلبات الفاشلة وتغييرات بوابة الدفع.

### Test Mode

إذا كانت إضافة Wayl توفر Test Mode:

1. أنشئ موقع staging:

```text
https://pay-staging.al-monqith.online
```

2. استخدم Test API Key.
3. اختبر:
   - دفع ناجح.
   - دفع فاشل.
   - إلغاء.
   - timeout.
   - إعادة callback.
   - callback مكرر.
   - اختلاف المبلغ.
   - refund.
4. لا تنتقل إلى Production Key قبل نجاح الاختبارات.

### المعلومات المطلوبة لاحقًا

اطلب من المالك:

- ملفات إضافة `wayl-checkout` أو رابطها الرسمي.
- Wayl API Key، ويضاف مباشرة إلى WordPress أو secret manager.
- gateway ID الحقيقي.
- توثيق callback/Webhook الخاص بالإضافة.
- هل Test Mode مدعوم؟
- العملات المدعومة فعليًا.
- WooCommerce Base URL.
- Consumer Key وConsumer Secret، ويخزنان كأسرار.

لا تطبع أي قيمة سرية في logs أو مخرجات Claude Code.
