import { randomUUID } from "node:crypto";
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
const isRenderService = Boolean(process.env.RENDER_SERVICE_ID) || process.env.RENDER === "true";
const serviceStoreDirectory = process.env.SERVICE_STORE_DIR?.trim()
  || (isRenderService || process.env.NODE_ENV === "production" ? "/var/data" : path.join(directory, ".data"));
const legacyServiceStoreDirectory = path.join(directory, ".data");
const serviceStorePath = path.join(serviceStoreDirectory, "services.json");
const discountStorePath = path.join(serviceStoreDirectory, "discounts.json");
const marketStorePath = path.join(serviceStoreDirectory, "market-listings.json");
const marketMediaDirectory = path.join(serviceStoreDirectory, "market-media");
const pointsStorePath = path.join(serviceStoreDirectory, "point-levels.json");
const orderStorePath = path.join(serviceStoreDirectory, "orders.json");
const defaultPointLevels = [
  { name: "برونزي", minimum: 0, perk: "الانضمام إلى برنامج الولاء", gift: "ترحيب خاص" },
  { name: "نحاسي", minimum: 100, perk: "أولوية متابعة الطلب", gift: "شارة نحاسية" },
  { name: "فضي", minimum: 500, perk: "مراجعة مجانية واحدة", gift: "شارة فضية" },
  { name: "ذهبي", minimum: 1000, perk: "أولوية في الرد", gift: "هدية رقمية" },
  { name: "بلاتيني", minimum: 2500, perk: "خصم خاص على الخدمات", gift: "قالب أكاديمي مجاني" },
  { name: "زمردي", minimum: 5000, perk: "أولوية تنفيذ", gift: "حزمة قوالب" },
  { name: "ماسي", minimum: 10000, perk: "مراجعتان مجانيتان", gift: "هدية أكاديمية" },
  { name: "ياقوتي", minimum: 25000, perk: "خصم مميز على الخدمات", gift: "رصيد خدمة مجاني" },
  { name: "سفير", minimum: 50000, perk: "دعم مباشر وأولوية قصوى", gift: "هدية مميزة من المنقذ" },
  { name: "نخبة", minimum: 100000, perk: "مزايا حصرية للخدمات", gift: "رصيد خدمات خاص" },
  { name: "متفوق", minimum: 250000, perk: "تنفيذ أولوية لجميع الطلبات", gift: "باقة خدمات مجانية" },
  { name: "أسطوري", minimum: 500000, perk: "امتيازات مخصصة", gift: "هدية خاصة من المشرف" },
  { name: "مليون", minimum: 1000000, perk: "كامل امتيازات البرنامج", gift: "الجائزة الكبرى" },
];
let serviceWriteQueue = Promise.resolve();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use("/api", (_request, response, next) => {
  response.set("Cache-Control", "no-store, max-age=0");
  next();
});

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

async function writeServiceStoreToPath(storePath, value) {
  await mkdir(path.dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryPath, storePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

async function readPersistentArray(storePath, defaultValue) {
  const candidates = [storePath];
  const legacyPath = path.join(legacyServiceStoreDirectory, path.basename(storePath));
  if (path.resolve(legacyPath) !== path.resolve(storePath)) candidates.push(legacyPath);

  for (const candidate of candidates) {
    let contents;
    try {
      contents = await readFile(candidate, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    const value = JSON.parse(contents);
    if (!Array.isArray(value)) throw new Error(`${path.basename(storePath)} must contain an array.`);
    if (candidate !== storePath) await writeServiceStoreToPath(storePath, value);
    return value;
  }

  const value = typeof defaultValue === "function" ? await defaultValue() : defaultValue;
  if (!Array.isArray(value)) throw new Error(`${path.basename(storePath)} default must be an array.`);
  await writeServiceStoreToPath(storePath, value);
  return value;
}

async function readServiceStore() {
  return readPersistentArray(serviceStorePath, async () => {
    const seed = JSON.parse(await readFile(serviceSeedPath, "utf8"));
    if (!Array.isArray(seed)) throw new Error("Service seed must contain an array.");
    return seed;
  });
}

async function updateServiceStore(update) {
  const operation = serviceWriteQueue.then(async () => {
    const services = await readServiceStore();
    const result = await update(services);
    await writeServiceStoreToPath(serviceStorePath, services);
    return result;
  });
  serviceWriteQueue = operation.catch(() => {});
  return operation;
}

async function readDiscountStore() {
  return readPersistentArray(discountStorePath, []);
}

async function updateDiscountStore(update) {
  const operation = serviceWriteQueue.then(async () => {
    const discounts = await readDiscountStore();
    const result = await update(discounts);
    await writeServiceStoreToPath(discountStorePath, discounts);
    return result;
  });
  serviceWriteQueue = operation.catch(() => {});
  return operation;
}

async function readOrderStore() {
  return readPersistentArray(orderStorePath, []);
}

function validateDiscountPayload(body, partial = false) {
  const payload = {};
  for (const field of ["code", "type", "value", "usageLimit", "startsAt", "expiresAt", "isActive"]) {
    if (field in (body ?? {})) payload[field] = body[field];
  }
  if (!partial && ["code", "type", "value", "usageLimit", "isActive"].some((field) => !(field in payload))) {
    return { error: "أكمل بيانات كود الخصم." };
  }
  if ("code" in payload) {
    if (typeof payload.code !== "string" || !/^[A-Z0-9_-]{3,24}$/.test(payload.code.trim().toUpperCase())) return { error: "رمز الخصم يجب أن يتكون من 3 إلى 24 حرفاً أو رقماً." };
    payload.code = payload.code.trim().toUpperCase();
  }
  if ("type" in payload && !["fixed", "percentage"].includes(payload.type)) return { error: "نوع الخصم غير صالح." };
  if ("value" in payload && (!Number.isSafeInteger(payload.value) || payload.value < 1 || (payload.type === "percentage" && payload.value > 100))) return { error: "قيمة الخصم غير صالحة." };
  if ("usageLimit" in payload && payload.usageLimit !== null && (!Number.isSafeInteger(payload.usageLimit) || payload.usageLimit < 1 || payload.usageLimit > 1000000)) return { error: "حد الاستخدام غير صالح." };
  for (const field of ["startsAt", "expiresAt"]) {
    if (field in payload && payload[field] !== null && (typeof payload[field] !== "string" || !Number.isFinite(Date.parse(payload[field])))) return { error: "تاريخ صلاحية الكود غير صالح." };
  }
  if ("startsAt" in payload && "expiresAt" in payload && payload.startsAt && payload.expiresAt && Date.parse(payload.startsAt) >= Date.parse(payload.expiresAt)) return { error: "تاريخ الانتهاء يجب أن يأتي بعد تاريخ البدء." };
  if ("isActive" in payload && typeof payload.isActive !== "boolean") return { error: "حالة الكود غير صالحة." };
  return { payload };
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

app.delete("/api/admin/services/:serviceId", adminActionLimiter, requireAdmin, async (request, response) => {
  const { serviceId } = request.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId)) {
    return response.status(400).json({ error: "معرّف الخدمة غير صالح." });
  }
  try {
    const removed = await updateServiceStore((services) => {
      const index = services.findIndex((service) => service.id === serviceId);
      if (index < 0) return false;
      services.splice(index, 1);
      return true;
    });
    if (!removed) return response.status(404).json({ error: "الخدمة غير موجودة." });
    return response.status(204).end();
  } catch {
    return response.status(503).json({ error: "تعذر حذف الخدمة من التخزين الدائم." });
  }
});

app.get("/api/admin/discounts", adminActionLimiter, requireAdmin, async (_request, response) => {
  try {
    const discounts = await readDiscountStore();
    discounts.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return response.json({ discounts });
  } catch {
    return response.status(503).json({ error: "تعذر تحميل أكواد الخصم من التخزين الدائم." });
  }
});

app.post("/api/admin/discounts", adminActionLimiter, requireAdmin, express.json({ limit: "8kb" }), async (request, response) => {
  const validated = validateDiscountPayload(request.body);
  if (validated.error) return response.status(400).json({ error: validated.error });
  try {
    const discount = await updateDiscountStore((discounts) => {
      if (discounts.some((item) => item.code === validated.payload.code)) return null;
      const created = { id: randomUUID(), usedCount: 0, createdAt: new Date().toISOString(), ...validated.payload };
      discounts.push(created);
      return created;
    });
    if (!discount) return response.status(409).json({ error: "رمز الخصم مستخدم مسبقاً." });
    return response.status(201).json(discount);
  } catch {
    return response.status(503).json({ error: "تعذر حفظ كود الخصم في التخزين الدائم." });
  }
});

app.patch("/api/admin/discounts/:discountId", adminActionLimiter, requireAdmin, express.json({ limit: "8kb" }), async (request, response) => {
  const { discountId } = request.params;
  if (!/^[0-9a-f-]{36}$/i.test(discountId)) return response.status(400).json({ error: "معرّف الكود غير صالح." });
  const validated = validateDiscountPayload(request.body, true);
  if (validated.error) return response.status(400).json({ error: validated.error });
  if (!Object.keys(validated.payload).length) return response.status(400).json({ error: "لا توجد تغييرات لحفظها." });
  try {
    const discount = await updateDiscountStore((discounts) => {
      if (validated.payload.code && discounts.some((item) => item.code === validated.payload.code && item.id !== discountId)) return "duplicate";
      const current = discounts.find((item) => item.id === discountId);
      if (!current) return null;
      Object.assign(current, validated.payload, { updatedAt: new Date().toISOString() });
      return current;
    });
    if (discount === "duplicate") return response.status(409).json({ error: "رمز الخصم مستخدم مسبقاً." });
    if (!discount) return response.status(404).json({ error: "كود الخصم غير موجود." });
    return response.json(discount);
  } catch {
    return response.status(503).json({ error: "تعذر تعديل كود الخصم في التخزين الدائم." });
  }
});

app.delete("/api/admin/discounts/:discountId", adminActionLimiter, requireAdmin, async (request, response) => {
  const { discountId } = request.params;
  try {
    const removed = await updateDiscountStore((discounts) => {
      const index = discounts.findIndex((item) => item.id === discountId);
      return index < 0 ? false : discounts.splice(index, 1).length > 0;
    });
    if (!removed) return response.status(404).json({ error: "كود الخصم غير موجود." });
    return response.status(204).end();
  } catch {
    return response.status(503).json({ error: "تعذر حذف كود الخصم من التخزين الدائم." });
  }
});

app.post("/api/discounts/validate", apiLimiter, express.json({ limit: "4kb" }), async (request, response) => {
  const code = typeof request.body?.code === "string" ? request.body.code.trim().toUpperCase() : "";
  const subtotal = request.body?.subtotal;
  if (!/^[A-Z0-9_-]{3,24}$/.test(code) || !Number.isSafeInteger(subtotal) || subtotal < 0) return response.status(400).json({ valid: false, message: "بيانات التحقق من الخصم غير صالحة." });
  try {
    const discounts = await readDiscountStore();
    const discount = discounts.find((item) => item.code === code);
    const now = Date.now();
    if (!discount || !discount.isActive || (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) || (discount.startsAt && Date.parse(discount.startsAt) > now) || (discount.expiresAt && Date.parse(discount.expiresAt) <= now)) {
      return response.status(400).json({ valid: false, message: "الكود غير صالح أو انتهى عدد استخداماته." });
    }
    return response.json({ valid: true, type: discount.type, value: discount.value });
  } catch {
    return response.status(503).json({ valid: false, message: "تعذر التحقق من كود الخصم." });
  }
});

async function readPointLevels() {
  return readPersistentArray(pointsStorePath, defaultPointLevels);
}

app.get("/api/points/levels", async (_request, response) => {
  try {
    return response.json({ levels: await readPointLevels() });
  } catch {
    return response.status(503).json({ error: "تعذر تحميل مراحل النقاط." });
  }
});

app.get("/api/admin/points/levels", adminActionLimiter, requireAdmin, async (_request, response) => {
  try {
    return response.json({ levels: await readPointLevels() });
  } catch {
    return response.status(503).json({ error: "تعذر تحميل مراحل النقاط." });
  }
});

app.put("/api/admin/points/levels", adminActionLimiter, requireAdmin, express.json({ limit: "24kb" }), async (request, response) => {
  const levels = request.body?.levels;
  if (!Array.isArray(levels) || levels.length < 2 || levels.length > 30) return response.status(400).json({ error: "أضف من مرحلتين إلى 30 مرحلة." });
  let previousMinimum = -1;
  for (const level of levels) {
    if (!level || typeof level.name !== "string" || !level.name.trim() || level.name.trim().length > 40 ||
      !Number.isSafeInteger(level.minimum) || level.minimum < 0 || level.minimum > 1000000 || level.minimum <= previousMinimum ||
      typeof level.perk !== "string" || level.perk.trim().length > 300 ||
      typeof level.gift !== "string" || level.gift.trim().length > 300) {
      return response.status(400).json({ error: "تحقق من أسماء المراحل ونقاطها وامتيازاتها وهداياها؛ النقاط تصاعدية حتى مليون." });
    }
    previousMinimum = level.minimum;
  }
  if (levels[0].minimum !== 0 || levels.at(-1).minimum !== 1000000) return response.status(400).json({ error: "يجب أن تبدأ المرحلة الأولى من صفر وتنتهي الأخيرة عند مليون نقطة." });
  const normalized = levels.map((level) => ({ name: level.name.trim(), minimum: level.minimum, perk: level.perk.trim(), gift: level.gift.trim() }));
  try {
    const operation = serviceWriteQueue.then(() => writeServiceStoreToPath(pointsStorePath, normalized));
    serviceWriteQueue = operation.catch(() => {});
    await operation;
    return response.json({ levels: normalized });
  } catch {
    return response.status(503).json({ error: "تعذر حفظ مراحل النقاط في التخزين الدائم." });
  }
});

app.get("/api/market/listings", async (_request, response) => {
  try {
    const listings = await readPersistentArray(marketStorePath, []);
    return response.json({ listings: listings.sort((left, right) => right.createdAt.localeCompare(left.createdAt)) });
  } catch (error) {
    if (error?.code === "ENOENT") return response.json({ listings: [] });
    return response.status(503).json({ error: "تعذر تحميل إعلانات السوق من التخزين الدائم." });
  }
});

app.post("/api/orders/whatsapp", apiLimiter, express.json({ limit: "12kb" }), async (request, response) => {
  const body = request.body ?? {};
  const phone = normalizeIraqiPhone(body.phone);
  const requiredText = [
    [body.serviceTitle, 200], [body.fullName, 100], [body.university, 120],
    [body.college, 120], [body.department, 120], [body.title, 300],
  ];
  if (!phone || requiredText.some(([value, maximum]) => typeof value !== "string" || !value.trim() || value.length > maximum) ||
    !Number.isSafeInteger(body.totalIqd) || body.totalIqd < 0 || body.totalIqd > 2147483647) {
    return response.status(400).json({ error: "تحقق من الاسم ورقم الهاتف والبيانات الجامعية وعنوان الطلب." });
  }
  const optionalText = (value, maximum) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
  const createdAt = new Date().toISOString();
  const order = {
    id: randomUUID(),
    order_number: `WA-${createdAt.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
    order_type: "whatsapp_request",
    service_id: optionalText(body.serviceId, 80),
    service_title: body.serviceTitle.trim(),
    full_name: body.fullName.trim(),
    student_phone: phone,
    university: body.university.trim(),
    college: body.college.trim(),
    department: body.department.trim(),
    supervisor: optionalText(body.supervisor, 120),
    report_title: body.title.trim(),
    notes: optionalText(body.notes, 2000),
    variant: optionalText(body.variant, 300),
    template: optionalText(body.template, 200),
    preferred_color: optionalText(body.color, 80),
    speed: optionalText(body.speed, 80),
    discount_code: optionalText(body.discountCode, 24),
    points_discount_iqd: Number.isSafeInteger(body.pointsDiscountIqd) ? Math.max(0, Math.min(body.pointsDiscountIqd, body.totalIqd)) : 0,
    total_iqd: body.totalIqd,
    status: "transferred_to_whatsapp",
    payment_status: "not_applicable",
    created_at: createdAt,
  };

  try {
    const operation = serviceWriteQueue.then(async () => {
      const orders = await readOrderStore();
      orders.push(order);
      await writeServiceStoreToPath(orderStorePath, orders);
    });
    serviceWriteQueue = operation.catch(() => {});
    await operation;
    return response.status(201).json({ order: { id: order.id, orderNumber: order.order_number, status: order.status, createdAt: order.created_at } });
  } catch {
    return response.status(503).json({ error: "تعذر حفظ الطلب على التخزين الدائم؛ لم يتم تحويلك إلى واتساب." });
  }
});

app.post("/api/market/listings", apiLimiter, express.json({ limit: "14mb" }), async (request, response) => {
  const body = request.body ?? {};
  const sellerPhone = normalizeIraqiPhone(body.sellerPhone);
  const allowedKinds = ["منتج", "خدمة"];
  if (
    typeof body.title !== "string" || body.title.trim().length < 3 || body.title.length > 120 ||
    typeof body.description !== "string" || body.description.trim().length < 10 || body.description.length > 3000 ||
    !Number.isSafeInteger(body.price) || body.price < 0 || body.price > 2147483647 ||
    typeof body.category !== "string" || body.category.length > 100 ||
    typeof body.location !== "string" || body.location.trim().length < 2 || body.location.length > 160 ||
    !allowedKinds.includes(body.kind) ||
    typeof body.seller !== "string" || body.seller.trim().length < 2 || body.seller.length > 100 ||
    !sellerPhone ||
    !body.media || typeof body.media.data !== "string" || typeof body.media.type !== "string"
  ) return response.status(400).json({ error: "أكمل بيانات الإعلان ورقم واتساب صالحاً وأرفق صورة أو فيديو." });

  const allowedMediaTypes = new Map([
    ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"],
    ["video/mp4", "mp4"], ["video/webm", "webm"], ["video/quicktime", "mov"],
  ]);
  const extension = allowedMediaTypes.get(body.media.type);
  const dataMatch = body.media.data.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/);
  if (!extension || !dataMatch || dataMatch[1] !== body.media.type) return response.status(400).json({ error: "نوع ملف الوسائط غير مدعوم." });
  const mediaBytes = Buffer.from(dataMatch[2], "base64");
  if (mediaBytes.length < 1 || mediaBytes.length > 10 * 1024 * 1024 || mediaBytes.toString("base64") !== dataMatch[2]) return response.status(413).json({ error: "حجم الصورة أو الفيديو يجب ألا يتجاوز 10 ميغابايت." });

  try {
    const id = randomUUID();
    const mediaName = `${id}.${extension}`;
    await mkdir(marketMediaDirectory, { recursive: true });
    await writeFile(path.join(marketMediaDirectory, mediaName), mediaBytes, { flag: "wx" });
    const listing = {
      id,
      title: body.title.trim(),
      price: body.price,
      tag: typeof body.condition === "string" ? body.condition.slice(0, 40) : typeof body.pricingUnit === "string" ? body.pricingUnit.slice(0, 40) : "متاح",
      style: "",
      category: body.category,
      kind: body.kind,
      mediaType: body.media.type.startsWith("video/") ? "فيديو" : "صورة",
      description: body.description.trim(),
      location: body.location.trim(),
      seller: body.seller.trim(),
      sellerPhone,
      createdAt: new Date().toISOString(),
      mediaUrl: `/market-media/${mediaName}`,
    };
    const operation = serviceWriteQueue.then(async () => {
      const listings = await readPersistentArray(marketStorePath, []);
      listings.push(listing);
      await writeServiceStoreToPath(marketStorePath, listings);
    });
    serviceWriteQueue = operation.catch(() => {});
    await operation;
    return response.status(201).json({ listing });
  } catch {
    return response.status(503).json({ error: "تعذر حفظ الإعلان أو وسائطه في التخزين الدائم." });
  }
});

app.use("/market-media", express.static(marketMediaDirectory, { fallthrough: false, immutable: true, maxAge: "1y" }));

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
  try {
    const orders = await readOrderStore();
    orders.sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
    return response.json({ orders: orders.slice(0, 100) });
  } catch {
    return response.status(503).json({ error: "تعذر تحميل الطلبات من قرص Render الدائم." });
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
    if ((await readOrderStore()).some((order) => order.id === orderId)) {
      return response.status(409).json({ error: "هذا الطلب أُحيل إلى واتساب؛ لا يُسجّل كطلب دفع من هذه اللوحة." });
    }
  } catch {
    return response.status(503).json({ error: "تعذر التحقق من نوع الطلب." });
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