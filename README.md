# Al-monqith-aljamiee

## Render

The repository root contains the Vite application and a Render Blueprint in
`render.yaml`. Create a Render service from this repository and use the Blueprint
configuration. It builds with `pnpm install --frozen-lockfile && pnpm build`,
starts with `pnpm start`, serves SPA routes, and exposes `/healthz` for health
checks.

## Wayl checkout prerequisites

The checkout endpoint creates unpaid IQD WooCommerce orders using product prices
read from WooCommerce; it never accepts a price from the browser. Configure the
WooCommerce URL, REST API credentials, actual Wayl gateway ID, and a JSON mapping
from application listing IDs to published WooCommerce product IDs in the Render
environment. For example, `WOOCOMMERCE_PRODUCT_MAP` can be
`{"M-101":123,"M-102":124}`. Install and configure the supplied Wayl plugin in
WooCommerce. Checkout also requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and a
valid Supabase student access token; requests without one are rejected.

Set secrets in Render's environment settings, not in Git or `VITE_*` variables.
The Wayl API key belongs only in the Wayl plugin settings in WordPress. The API
key shared in the conversation should be rotated before use. The WooCommerce
webhook endpoint verifies signatures, but payment status is not yet synchronized
to an application database. Do not treat this as a complete production payment
workflow until Supabase Auth is integrated into the app and webhook persistence
is implemented.

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
description, IQD price, duration, features, variants, visibility, and publish
status. The public service list reads only active rows from Supabase. No sample
services or templates are inserted; add real services after applying the
migration.

Important: the current student order form still saves orders in browser
`localStorage`. Those orders are not visible to this Supabase-backed admin list
and cannot be safely confirmed there. Migrate student authentication and order
creation to Supabase before using manual payment confirmation for real orders.
Marketplace posting remains unavailable until persistent database and media
storage are configured; the UI does not claim a local-only listing was saved.

The Supabase publishable key and URL are configured as Render environment
variables. The `service_role` key is not configured in the app or Render. Since
it was shared in chat, rotate it before running `pnpm admin:create` or any
privileged Supabase operation.