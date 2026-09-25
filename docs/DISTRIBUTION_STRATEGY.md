# La Trama Pública — Distribution Strategy

Updated: 2026-09-25

## Principle
The website is canonical. Search engines, social networks, messaging apps, newsletters and communities are distribution channels, not the source of record.

## Automatic foundation
- Every article keeps a canonical URL, Open Graph/X card, author/date metadata and Article/NewsArticle JSON-LD.
- `sitemap.xml`, `news-sitemap.xml` and `rss.xml` are generated from published article metadata.
- News-sitemap generation keeps only articles inside Google's recent-news window.
- Article pages expose WhatsApp, X, Telegram, native-share and copy-link controls.
- Distributed social links use UTM parameters; canonical URLs remain clean.
- `data/distribution.json` and `distribution/*.md` prepare channel copy without publishing externally.
- Privacy-conscious first-party analytics records pageviews, approximate unique browsers, source/referrer/campaign and share-button usage.

## Owned / controlled channels
Website, RSS and future email/WhatsApp/Telegram subscriptions are the durable base. X, Instagram and YouTube should point readers back to the canonical article.

## Search/discovery
Use Google Search Console for sitemap submission, indexing diagnostics, queries, impressions, clicks and CTR. Google News/Discover eligibility is technical, not guaranteed placement.

## Communities
Reddit and other communities are manual/selective: post only where the article is contextually relevant and community rules permit it. No unsolicited DMs or spam automation.

## Facebook
OPTIONAL / FUTURE / MANUAL while the Meta account remains blocked. Do not create bypass accounts or request identity documents for this project.

## Measurement
Use UTM source names consistently: `whatsapp`, `x`, `telegram`, `instagram`, `newsletter`, `reddit`. Default social campaign: `article_share`. Newsletter campaign: `article_digest`.
