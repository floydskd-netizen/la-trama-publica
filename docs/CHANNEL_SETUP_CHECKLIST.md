# La Trama Pública — Channel Setup Checklist

Updated: 2026-09-25

## AUTOMATIC
- Canonical/OG/X/article metadata and structured data.
- Sitemap, recent-news sitemap and RSS generation.
- Article sharing controls and tracked UTM links.
- Reusable WhatsApp/X/Telegram/Instagram/newsletter/video copy.
- First-party audience analytics and private admin summary.

## OWNER ACTION REQUIRED
### Google Search Console
1. Add URL-prefix property `https://floydskd-netizen.github.io/la-trama-publica/`.
2. Choose HTML-tag verification and give the verification meta value to the site maintainer, or use another method Google offers that you control.
3. After verification submit `sitemap.xml` and `news-sitemap.xml`.

### Supabase authentication email
Configure custom SMTP/Resend, then verify real login -> alias -> comment -> reply -> report -> technical access log. Do not spend more built-in Supabase magic-link quota meanwhile.

### X / WhatsApp Channel / Telegram Channel / Instagram / YouTube
Create or select the official account/channel and authorize any future publishing integration. Until then, use the generated copy manually. No external posting is automatic.

### Analytics admin
The reader account used for the private dashboard must have the existing `admin` role. Authentication email must work, or an existing valid session must be present.

## OPTIONAL
- Newsletter provider when there is enough recurring readership to justify it.
- Facebook only if the existing Meta account becomes usable; no bypass account or ID-upload workflow is required by this project.
