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