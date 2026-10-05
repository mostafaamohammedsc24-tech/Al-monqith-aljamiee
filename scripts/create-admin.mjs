import { stdin, stdout } from "node:process";

function normalizeIraqiPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const normalized = digits.startsWith("00964") ? `+${digits.slice(2)}`
    : digits.startsWith("964") ? `+${digits}`
      : digits.startsWith("0") ? `+964${digits.slice(1)}`
        : null;
  return normalized && /^\+9647\d{9}$/.test(normalized) ? normalized : null;
}

function readSecret(prompt) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error("Run this command in an interactive terminal."));
      return;
    }

    let value = "";
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();

    const finish = (error) => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      const input = chunk.toString("utf8");
      if (input === "\u0003") {
        finish(new Error("Cancelled."));
      } else if (input === "\r" || input === "\n") {
        finish();
      } else if (input === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += input;
      }
    };

    stdin.on("data", onData);
  });
}

const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const phone = normalizeIraqiPhone(process.env.ADMIN_PHONE);

if (!supabaseUrl || !serviceRoleKey || !phone) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_PHONE before running this command.");
  process.exit(1);
}

if (new URL(supabaseUrl).protocol !== "https:") {
  console.error("SUPABASE_URL must use HTTPS.");
  process.exit(1);
}

try {
  const password = await readSecret("New admin password (hidden): ");
  const confirmation = await readSecret("Confirm new admin password (hidden): ");
  if ([...password].length < 14 || password !== confirmation) {
    throw new Error("Passwords must match and contain at least 14 characters.");
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
  let existingUser = null;
  for (let page = 1; page <= 100; page += 1) {
    const list = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=100`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!list.ok) throw new Error("Unable to look up the admin account in Supabase.");
    const result = await list.json();
    const users = result.users || [];
    existingUser = users.find((user) => normalizeIraqiPhone(user.phone) === phone) || null;
    if (existingUser || users.length < 100) break;
  }

  const response = await fetch(
    existingUser
      ? `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(existingUser.id)}`
      : `${supabaseUrl}/auth/v1/admin/users`,
    {
      method: existingUser ? "PUT" : "POST",
      headers,
      body: JSON.stringify({
        phone,
        password,
        phone_confirm: true,
        app_metadata: { ...(existingUser?.app_metadata || {}), role: "admin" },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!response.ok) throw new Error("Supabase rejected admin provisioning; verify the project and service-role key.");
  console.log(existingUser
    ? "Existing admin phone updated with the new password and admin role."
    : "Admin account created with the configured phone and admin role.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Admin provisioning failed.");
  process.exitCode = 1;
}