import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";

const directory = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 10000;
const distDirectory = path.join(directory, "dist");
const serviceSeedPath = path.join(directory, "data", "services.seed.json");
const serviceStoreDirectory = process.env.SERVICE_STORE_DIR?.trim()
  || (process.env.NODE_ENV === "production" ? "/var/data" : path.join(directory, ".data"));
const serviceStorePath = path.join(serviceStoreDirectory, "services.json");
let serviceWriteQueue = Promise.resolve();
let serviceStoreInitialization;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function configuredWooCommerce() {
  const baseUrl = process.env.WOOCOMMERCE_BASE_URL?.trim().replace(/\/+$/, "");
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim();
  const gatewayId = process.env.WOOCOMMERCE_WAYL_GATEWAY_ID?.trim();

  if (!baseUrl || !consumerKey || !consumerSecret || !gatewayId) return null;

  try {
    if (new URL(baseUrl).protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { baseUrl, consumerKey, consumerSecret, gatewayId };
}

function configuredSupabase() {
  const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!baseUrl || !anonKey) return null;

  try {
    if (new URL(baseUrl).protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { baseUrl, anonKey };
}

function normalizeIraqiPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const normalized = digits.startsWith("00964") ? `+${digits.slice(2)}`
    : digits.startsWith("964") ? `+${digits}`
      : digits.startsWith("0") ? `+964${digits.slice(1)}`
        : null;
  return normalized && /^\+9647\d{9}$/.test(normalized) ? normalized : null;
}

function configuredAdminPhone() {
  return normalizeIraqiPhone(process.env.ADMIN_PHONE);
}

async function getSupabaseUser(config, accessToken) {
  try {
    const result = await fetch(`${config.baseUrl}/auth/v1/user`, {
      headers: { apikey: config.anonKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    return result.ok ? result.json() : null;
  } catch {
    return null;
  }
}

async function authenticatedSupabaseUser(request) {
  const config = configuredSupabase();
  const token = request.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!config || !token) return false;
  return Boolean(await getSupabaseUser(config, token));
}

async function requireAdmin(request, response, next) {
  const config = configuredSupabase();
  const allowedPhone = configuredAdminPhone();
  const token = request.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!config || !allowedPhone) {
    return response.status(503).json({ error: "Admin authentication is not configured on the server" });
  }
  if (!token) return response.status(401).json({ error: "تتطلب هذه العملية جلسة مشرف." });

  const user = await getSupabaseUser(config, token);
  if (!user) return response.status(401).json({ error: "انتهت جلسة المشرف." });
  if (user.app_metadata?.role !== "admin" || normalizeIraqiPhone(user.phone) !== allowedPhone) {
    return response.status(403).json({ error: "هذا الحساب لا يملك صلاحية الإدارة." });
  }

  request.adminSession = { config, token, user };
  return next();
}

async function writeServiceStore(services) {
  await mkdir(path.dirname(serviceStorePath), { recursive: true });
  const temporaryPath = `${serviceStorePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(services, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryPath, serviceStorePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

async function readServiceStore() {
  try {
    const services = JSON.parse(await readFile(serviceStorePath, "utf8"));
    if (!Array.isArray(services)) throw new Error("Service store must contain an array.");
    return services;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (!serviceStoreInitialization) {
      serviceStoreInitialization = (async () => {
        try {
          return JSON.parse(await readFile(serviceStorePath, "utf8"));
        } catch (readError) {
          if (readError?.code !== "ENOENT") throw readError;
        }
        const seed = JSON.parse(await readFile(serviceSeedPath, "utf8"));
        if (!Array.isArray(seed)) throw new Error("Service seed must contain an array.");
        await writeServiceStore(seed);
        return seed;
      })();
    }
    try {
      return await serviceStoreInitialization;
    } catch (initializationError) {
      serviceStoreInitialization = undefined;
      throw initializationError;
    }
  }
}

async function updateServiceStore(update) {
  const operation = serviceWriteQueue.then(async () => {
    const services = await readServiceStore();
    const result = await update(services);
    await writeServiceStore(services);
    return result;
  });
  serviceWriteQueue = operation.catch(() => {});
  return operation;
}

function validateServicePayload(body, partial = false) {
  const fields = ["title", "description", "category", "base_price_iqd", "duration_label", "icon", "color", "features", "variants", "delivery", "provider", "template_group", "is_active", "show_price", "sort_order"];
  const payload = {};
  for (const field of fields) {
    if (!(field in (body ?? {}))) continue;
    const value = body[field];
    payload[field] = typeof value === "string"
      ? value.trim()
      : Array.isArray(value)
        ? value.map((item) => typeof item === "string" ? item.trim() : item)
        : value;
  }

  if (!partial && ["title", "description", "category", "base_price_iqd", "duration_label"].some((field) => !(field in payload))) {
    return { error: "أكمل اسم الخدمة ووصفها وفئتها وسعرها ومدتها." };
  }
  if ("title" in payload && (typeof payload.title !== "string" || payload.title.length < 1 || payload.title.length > 200)) return { error: "اسم الخدمة مطلوب، وبحد أقصى 200 حرف." };
  if ("description" in payload && (typeof payload.description !== "string" || payload.description.length < 1 || payload.description.length > 5000)) return { error: "وصف الخدمة مطلوب، وبحد أقصى 5000 حرف." };
  if ("category" in payload && (typeof payload.category !== "string" || payload.category.length < 1 || payload.category.length > 100)) return { error: "فئة الخدمة مطلوبة، وبحد أقصى 100 حرف." };
  if ("base_price_iqd" in payload && (!Number.isSafeInteger(payload.base_price_iqd) || payload.base_price_iqd < 0 || payload.base_price_iqd > 2147483647)) return { error: "السعر يجب أن يكون عدداً صحيحاً بين صفر و2,147,483,647 دينار." };
  if ("duration_label" in payload && (typeof payload.duration_label !== "string" || payload.duration_label.length < 1 || payload.duration_label.length > 150)) return { error: "مدة التنفيذ مطلوبة، وبحد أقصى 150 حرفاً." };
  if ("icon" in payload && (typeof payload.icon !== "string" || payload.icon.length > 40)) return { error: "رمز الخدمة غير صالح." };
  if ("color" in payload && (typeof payload.color !== "string" || payload.color.length > 40)) return { error: "لون الخدمة غير صالح." };
  if ("delivery" in payload && !["رقمي", "حضوري", "رقمي وحضوري"].includes(payload.delivery)) return { error: "طريقة التسليم غير صالحة." };
  if ("provider" in payload && !["تنفيذ آلي", "مقدم خدمة", "مختص أكاديمي"].includes(payload.provider)) return { error: "نوع مقدم الخدمة غير صالح." };
  if ("template_group" in payload && payload.template_group !== null && !["تقارير", "عروض", "تصاميم", "سيرة مهنية", "وثائق", "تقنية"].includes(payload.template_group)) return { error: "مجموعة القوالب غير صالحة." };
  if ("features" in payload && (!Array.isArray(payload.features) || payload.features.length > 50 || payload.features.some((item) => typeof item !== "string" || item.length > 500))) return { error: "أدخل حتى 50 ميزة، بحد أقصى 500 حرف لكل ميزة." };
  if ("variants" in payload && (!Array.isArray(payload.variants) || payload.variants.length > 30 || payload.variants.some((item) => typeof item !== "string" || item.length > 300))) return { error: "أدخل حتى 30 خياراً، بحد أقصى 300 حرف لكل خيار." };
  if ("is_active" in payload && typeof payload.is_active !== "boolean") return { error: "حالة النشر غير صالحة." };
  if ("show_price" in payload && typeof payload.show_price !== "boolean") return { error: "إعداد عرض السعر غير صالح." };
  if ("sort_order" in payload && (!Number.isSafeInteger(payload.sort_order) || payload.sort_order < 0 || payload.sort_order > 100000)) return { error: "ترتيب الخدمة غير صالح." };
  return { payload };
}

app.get("/api/services", async (_request, response) => {
  try {
    const services = await readServiceStore();
    services.sort((left, right) => left.sort_order - right.sort_order || left.title.localeCompare(right.title, "ar"));
    return response.json({ services: services.filter((service) => service.is_active) });
  } catch {
    return response.status(503).json({ error: "تعذر تحميل كتالوج الخدمات من التخزين الدائم." });
  }
});

app.get("/api/admin/services", adminActionLimiter, requireAdmin, async (request, response) => {
  try {
    const services = await readServiceStore();
    services.sort((left, right) => left.sort_order - right.sort_order || left.title.localeCompare(right.title, "ar"));
    return response.json({ services });
  } catch {
    return response.status(503).json({ error: "تعذر تحميل الخدمات من التخزين الدائم." });
  }
});

app.post("/api/admin/services", adminActionLimiter, requireAdmin, express.json({ limit: "24kb" }), async (request, response) => {
  const validated = validateServicePayload(request.body);
  if (validated.error) return response.status(400).json({ error: validated.error });
  try {
    const service = await updateServiceStore((services) => {
      const now = new Date().toISOString();
      const nextOrder = services.reduce((maximum, item) => Math.max(maximum, item.sort_order || 0), 0) + 10;
      const created = {
        icon: "file",
        color: "blue",
        features: [],
        variants: [],
        delivery: "رقمي",
        provider: "مقدم خدمة",
        template_group: null,
        is_active: false,
        show_price: true,
        sort_order: nextOrder,
        created_at: now,
        updated_at: now,
        ...validated.payload,
        id: randomUUID(),
        sort_order: validated.payload.sort_order ?? nextOrder,
      };
      services.push(created);
      return created;
    });
    return response.status(201).json({ service });
  } catch {
    return response.status(503).json({ error: "تعذر حفظ الخدمة في التخزين الدائم." });
  }
});

app.patch("/api/admin/services/:serviceId", adminActionLimiter, requireAdmin, express.json({ limit: "24kb" }), async (request, response) => {
  const serviceId = request.params.serviceId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId)) return response.status(400).json({ error: "معرّف الخدمة غير صالح." });
  const validated = validateServicePayload(request.body, true);
  if (validated.error) return response.status(400).json({ error: validated.error });
  if (!Object.keys(validated.payload).length) return response.status(400).json({ error: "لا توجد تغييرات لحفظها." });
  try {
    const service = await updateServiceStore((services) => {
      const current = services.find((item) => item.id === serviceId);
      if (!current) return null;
      Object.assign(current, validated.payload, { updated_at: new Date().toISOString() });
      return current;
    });
    if (!service) return response.status(404).json({ error: "الخدمة غير موجودة." });
    return response.json({ service });
  } catch {
    return response.status(503).json({ error: "تعذر تعديل الخدمة في التخزين الدائم." });
  }
});

function productMap() {
  try {
    const value = JSON.parse(process.env.WOOCOMMERCE_PRODUCT_MAP || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function validPhone(phone) {
  return /^\+?\d[\d\s()-]{7,17}$/.test(phone);
}

async function wooRequest(config, resource, options = {}) {
  const response = await fetch(`${config.baseUrl}/wp-json/wc/v3/${resource}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error("WooCommerce request failed");
  return response.json();
}

app.get("/healthz", (_request, response) => response.status(200).json({ status: "ok" }));

app.post("/api/admin/login", adminLoginLimiter, express.json({ limit: "8kb" }), async (request, response) => {
  const config = configuredSupabase();
  const allowedPhone = configuredAdminPhone();
  const phone = normalizeIraqiPhone(request.body?.phone);
  const password = request.body?.password;

  if (!config || !allowedPhone) {
    return response.status(503).json({ error: "Admin authentication is not configured on the server" });
  }
  if (!phone || phone !== allowedPhone || typeof password !== "string" || !password.length || password.length > 128) {
    return response.status(401).json({ error: "بيانات دخول المشرف غير صحيحة." });
  }

  try {
    const result = await fetch(`${config.baseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: config.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
      signal: AbortSignal.timeout(10000),
    });
    if (!result.ok) return response.status(401).json({ error: "بيانات دخول المشرف غير صحيحة." });

    const session = await result.json();
    const user = session.user;
    if (user?.app_metadata?.role !== "admin" || normalizeIraqiPhone(user.phone) !== allowedPhone) {
      return response.status(403).json({ error: "هذا الحساب لا يملك صلاحية الإدارة." });
    }

    return response.json({ accessToken: session.access_token, expiresIn: session.expires_in });
  } catch {
    return response.status(503).json({ error: "تعذر الاتصال بخدمة تسجيل الدخول." });
  }
});

app.get("/api/admin/orders", adminActionLimiter, requireAdmin, async (request, response) => {
  const { config, token } = request.adminSession;
  const query = new URLSearchParams({
    select: "id,order_number,service_title,total_iqd,status,payment_status,payment_method,payment_reference,paid_at,created_at",
    payment_status: "eq.pending",
    order: "created_at.desc",
    limit: "100",
  });

  try {
    const result = await fetch(`${config.baseUrl}/rest/v1/orders?${query}`, {
      headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!result.ok) return response.status(503).json({ error: "تعذر تحميل الطلبات؛ تحقق من تطبيق ترحيل قاعدة البيانات." });
    return response.json({ orders: await result.json() });
  } catch {
    return response.status(503).json({ error: "تعذر الاتصال بقاعدة البيانات." });
  }
});

app.post("/api/admin/orders/:orderId/confirm-offline-payment", adminActionLimiter, requireAdmin, express.json({ limit: "8kb" }), async (request, response) => {
  const { config, token } = request.adminSession;
  const { orderId } = request.params;
  const { method, reference, reason } = request.body ?? {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    return response.status(400).json({ error: "رقم الطلب غير صالح." });
  }
  if (!new Set(["cash", "bank_transfer"]).has(method)) {
    return response.status(400).json({ error: "طريقة القبض يجب أن تكون نقداً أو تحويلاً." });
  }
  if (typeof reason !== "string" || reason.trim().length < 5 || reason.length > 500) {
    return response.status(400).json({ error: "أدخل سبباً واضحاً لتأكيد القبض." });
  }
  if (reference !== undefined && reference !== null && (typeof reference !== "string" || reference.length > 120)) {
    return response.status(400).json({ error: "رقم الإيصال أو التحويل غير صالح." });
  }

  try {
    const result = await fetch(`${config.baseUrl}/rest/v1/rpc/admin_confirm_offline_payment`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_order_id: orderId,
        p_method: method,
        p_reference: typeof reference === "string" ? reference.trim() || null : null,
        p_reason: reason.trim(),
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!result.ok) {
      const error = await result.json().catch(() => ({}));
      if (error.code === "P0002") return response.status(404).json({ error: "الطلب غير موجود." });
      if (error.code === "P0001") return response.status(409).json({ error: "تم تأكيد دفع هذا الطلب مسبقاً أو لا يقبل الدفع." });
      if (error.code === "42501") return response.status(403).json({ error: "ليس لديك صلاحية تأكيد الدفع." });
      return response.status(503).json({ error: "تعذر حفظ تأكيد الدفع؛ تحقق من ترحيل قاعدة البيانات." });
    }

    return response.json({ confirmation: await result.json() });
  } catch {
    return response.status(503).json({ error: "تعذر الاتصال بقاعدة البيانات." });
  }
});

app.post("/api/payments/wayl/checkout", apiLimiter, express.json({ limit: "16kb" }), async (request, response) => {
  if (!configuredSupabase()) {
    return response.status(503).json({ error: "Student authentication is not configured on the server" });
  }
  if (!(await authenticatedSupabaseUser(request))) {
    return response.status(401).json({ error: "A valid student session is required" });
  }

  const config = configuredWooCommerce();
  if (!config) {
    return response.status(503).json({ error: "Wayl checkout is not configured on the server" });
  }

  const { listingId, customer } = request.body ?? {};
  if (
    typeof listingId !== "string" || listingId.length > 80 ||
    !customer || typeof customer !== "object" ||
    typeof customer.fullName !== "string" || customer.fullName.trim().length < 2 || customer.fullName.length > 100 ||
    typeof customer.phone !== "string" || !validPhone(customer.phone)
  ) {
    return response.status(400).json({ error: "Invalid checkout details" });
  }

  const mappedProductId = Number(productMap()[listingId]);
  if (!Number.isSafeInteger(mappedProductId) || mappedProductId < 1) {
    return response.status(404).json({ error: "This listing is not available for online checkout" });
  }

  try {
    const product = await wooRequest(config, `products/${mappedProductId}`);
    const price = Number(product.price);
    if (product.status !== "publish" || product.purchasable === false || !Number.isSafeInteger(price) || price <= 0) {
      return response.status(409).json({ error: "This product cannot be purchased" });
    }

    const name = customer.fullName.trim().split(/\s+/);
    const order = await wooRequest(config, "orders", {
      method: "POST",
      body: JSON.stringify({
        payment_method: config.gatewayId,
        payment_method_title: "Wayl",
        set_paid: false,
        currency: "IQD",
        billing: {
          first_name: name[0],
          last_name: name.slice(1).join(" "),
          phone: customer.phone.trim(),
        },
        customer_note: typeof customer.delivery === "string" ? customer.delivery.slice(0, 500) : "",
        line_items: [{ product_id: mappedProductId, quantity: 1 }],
        meta_data: [{ key: "al_monqith_listing_id", value: listingId }],
      }),
    });

    const checkoutUrl = new URL(order.payment_url);
    const lineItem = Array.isArray(order.line_items) && order.line_items.length === 1 ? order.line_items[0] : null;
    if (
      order.currency !== "IQD" || !lineItem || lineItem.product_id !== mappedProductId ||
      Number(lineItem.total) !== price ||
      checkoutUrl.protocol !== "https:" || checkoutUrl.host !== new URL(config.baseUrl).host
    ) {
      return response.status(502).json({ error: "WooCommerce returned an invalid payment order" });
    }

    return response.status(201).json({ checkoutUrl: checkoutUrl.toString() });
  } catch {
    return response.status(502).json({ error: "Unable to create a Wayl checkout right now" });
  }
});

app.post("/api/webhooks/woocommerce", apiLimiter, express.raw({ type: "application/json", limit: "256kb" }), async (request, response) => {
  const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
  const signature = request.get("x-wc-webhook-signature");
  if (!secret || !signature || !Buffer.isBuffer(request.body)) {
    return response.status(503).json({ error: "Webhook verification is not configured" });
  }

  const expected = createHmac("sha256", secret).update(request.body).digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, "base64");
  } catch {
    return response.status(401).json({ error: "Invalid webhook signature" });
  }
  if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) {
    return response.status(401).json({ error: "Invalid webhook signature" });
  }

  let event;
  try {
    event = JSON.parse(request.body.toString("utf8"));
  } catch {
    return response.status(400).json({ error: "Invalid webhook payload" });
  }

  if (!Number.isSafeInteger(event.id) || event.currency !== "IQD" || !event.status) {
    return response.status(400).json({ error: "Invalid WooCommerce order event" });
  }

  return response.status(202).json({ accepted: true, orderId: event.id });
});

app.use(express.static(distDirectory, { index: false, fallthrough: true }));
app.get(/.*/, async (_request, response, next) => {
  try {
    response.set("Cache-Control", "no-cache");
    response.type("html").send(await readFile(path.join(distDirectory, "index.html")));
  } catch (error) {
    next(error);
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Web service listening on port ${port}`);
});