import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";

const directory = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 10000;
const distDirectory = path.join(directory, "dist");

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
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

async function authenticatedSupabaseUser(request) {
  const config = configuredSupabase();
  const token = request.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!config || !token) return false;

  try {
    const result = await fetch(`${config.baseUrl}/auth/v1/user`, {
      headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    return result.ok;
  } catch {
    return false;
  }
}

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