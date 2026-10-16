# Al-monqith-aljamiee

## Render

The repository root contains the Vite application and a Render Blueprint in
`render.yaml`. Create a Render service from this repository and use the Blueprint
configuration. It builds with `pnpm install --frozen-lockfile && pnpm build`,
starts with `pnpm start`, serves SPA routes, and exposes `/healthz` for health
checks.

Persistent JSON data uses `SERVICE_STORE_DIR=/var/data`. The server also detects
Render directly, so storage does not depend on Render having `NODE_ENV` set.
Existing JSON files under the previous `.data` directory are copied to the
persistent disk on first access.

## Admin access and offline payments

Student registration remains saved on the current device by phone number only,
without OTP, as requested. The login modal's **دخول المشرفين** link opens
`/admin/login`. Admin login is verified by the server against Supabase Auth, the
`ADMIN_PHONE` allowlist, and `app_metadata.role = admin`; client-side phone or
password checks are not used.

To provision the existing admin phone safely:

1. Rotate any password previously shared in chat; do not reuse it.
2. Apply `supabase/migrations/20261005000100_secure_offline_payment_confirmation.sql`
	in the Supabase SQL Editor. It creates protected services, orders, payments,
	receipts, audit logs, and the transactional offline-payment RPC.
3. In a trusted local terminal, set `SUPABASE_URL`,
	`SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_PHONE` in the environment. Never add
	the service-role key to Git, frontend variables, or Render runtime settings.
4. Run `pnpm admin:create` and enter a new password of at least 14 characters
	at the hidden prompts. The script updates an existing phone account or
	creates one, assigns `app_metadata.role = admin`, and does not print the
	password.
5. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `ADMIN_PHONE` in Render's
	environment settings, then redeploy.

Authenticated admins can mark a database order as paid by cash or bank transfer.
The server reads the amount from the order row, rejects duplicate confirmation,
and records the method, reference, reason, actor, and timestamp transactionally
in `payments`, `receipts`, and `admin_audit_logs`.
This creates the receipt record and number; PDF generation and private signed
storage are not implemented yet.

Admins can add and edit services at `/admin/services`, including category,
description, IQD price, duration, delivery, provider, template group, features,
variants, visibility, and publish status. The service API stores the catalog as
JSON on Render's persistent disk at `/var/data/services.json`; the bundled
`data/services.seed.json` initializes the disk on first access. Supabase remains
responsible for admin authentication, but the service catalog does not require a
Supabase table or migration. Keep the Render disk mounted at `/var/data`.

Student service requests are written to `/var/data/orders.json` before the
WhatsApp handoff and appear in the authenticated admin order list. The student
copy is also kept in browser `localStorage` because student profiles are still
device-local. These are requests with estimated prices, not confirmed payments;
only Supabase-backed database orders can use the manual-payment confirmation.

Admin discount codes are stored in `/var/data/discounts.json`, and loyalty tiers
are stored in `/var/data/point-levels.json`; configure tiers at `/admin/points`.
Marketplace listings and uploaded media are stored in
`/var/data/market-listings.json` and `/var/data/market-media`. Marketplace
publishing requires a profile on the current device, and buyer contact opens
the seller's registered phone number in WhatsApp. Student profiles are still
device-local and are not verified with Supabase Auth, so marketplace contact
details are not independently verified. The Render disk must remain mounted at
`/var/data` for these files and uploads to survive redeploys.

The Supabase publishable key and URL are configured as Render environment
variables. The `service_role` key is not configured in the app or Render. Rotate
any service-role key shared outside a trusted secret manager before using it.