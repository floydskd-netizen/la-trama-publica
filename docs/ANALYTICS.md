# La Trama Pública — Analytics

Updated: 2026-09-25

## What is measured
The site records `pageview` and share-button events in Supabase. Fields are limited to page path, article key, referrer hostname, UTM source/medium/campaign/content, locale, broad device class and share target.

A random browser UUID is created client-side and rotated after 30 days. The Edge Function stores only its SHA-256 hash. General analytics does not store the visitor IP or full referrer URL.

## Metrics
- Pageviews: recorded pageview events.
- Approximate unique visitors: distinct 30-day browser hashes, not people/accounts.
- Sources/campaigns: UTM attribution captured before tracking parameters are removed from the visible URL.
- Referrers: hostname only.
- Shares: clicks on WhatsApp, X, Telegram, native share or copy-link controls.

## Private dashboard
`admin/analytics.html` calls the authenticated `admin_analytics_summary()` RPC. The RPC verifies `auth.uid()` has role `admin` and returns aggregates only. Raw `analytics_events` has RLS enabled and no anon/authenticated table grants.

## Operational files
- `supabase/migrations/005_analytics.sql`
- `supabase/functions/record-analytics/index.ts`
- `admin/analytics.html`
- `admin/analytics.js`

## Limits
Browser privacy controls, blocked scripts, cleared storage and multi-device use mean unique visitors are estimates. Search Console remains the source for Google impressions, clicks, CTR and search queries.
