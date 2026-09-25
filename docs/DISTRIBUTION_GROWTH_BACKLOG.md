# La Trama Pública — Distribution / Discoverability / Growth Backlog

Source brief added 2026-09-25 from the owner's approved implementation request.
This is an implementation backlog, not a generic recommendation memo.

## Primary objective

La Trama Pública must not depend on direct homepage visits.
Every article should be prepared to:
1. index correctly in search engines;
2. generate professional social previews;
3. be eligible for Google Search / News / Discover where technically possible;
4. distribute cleanly through WhatsApp, X, Telegram, Instagram, YouTube and other relevant channels;
5. generate reusable distribution copy;
6. measure traffic sources;
7. turn occasional readers into returning readers.

The website remains canonical. External platforms are distribution pipes.

## Hard constraints

- Facebook is NOT required.
- Do not create or bypass Meta accounts/verification.
- Do not ask for or upload owner ID.
- Facebook may be supported in metadata/copy only as OPTIONAL / FUTURE / MANUAL.
- Do not spam communities or automate unsolicited direct messages.
- Do not publish externally without explicit authorization/account connection.
- Do not commit secrets, passwords or private keys.
- Preserve the static HTML architecture unless evidence requires changing it.
## Phase map

### 1. Article discoverability
Audit every article for canonical URL, title, description, Open Graph, X card, author, published/modified dates, language and suitable preview image. Prefer a common mechanism over manual duplication.

### 2. Structured data
Add valid schema.org `NewsArticle` or `Article` JSON-LD with headline, description, image, dates, author, publisher/logo and `mainEntityOfPage`. Never invent missing metadata.

### 3. Sitemaps / Google discovery
Audit or implement normal sitemap, news sitemap when appropriate, robots references, canonical URLs and indexing-friendly navigation. Document manual Search Console submission. Never promise News/Discover inclusion.

### 4. RSS / syndication
Create or verify an RSS/Atom feed exposing title, canonical URL, publication date, excerpt and image when practical. New articles should update it through one maintainable workflow.

### 5. Article sharing
Every article: WhatsApp, X, Telegram, copy link; optional email/Facebook. Use canonical URLs and mobile-friendly Web Share/native share URLs. Avoid intrusive third-party widgets.

### 6. Distribution content generator
Per article prepare: short headline, WhatsApp copy, X copy, Telegram copy, Instagram caption, 30–60 second video script and newsletter excerpt. Generated copy must not introduce unsupported claims.
### 7. Trackable distribution links
Define consistent UTM conventions for WhatsApp, X, Telegram, Instagram, newsletter, Reddit and relevant communities. Canonical URLs stay clean; tracking parameters exist only on distributed links. Provide a small generator/utility.

### 8. Traffic analytics
Determine current analytics first. Required visibility: pageviews, reasonable unique visitors, referrer/source, search traffic, campaign traffic, most-read articles, traffic by date and share-button usage when reasonable. Prefer privacy-conscious, low-maintenance and free/existing infrastructure unless approval is given.

Document Google Search Console separately for impressions, clicks, CTR, queries and News/Discover traffic when those reports exist.

### 9. Reader retention
Improve article-to-article progression: latest news, related stories, next/previous navigation, topics/categories, RSS, and future WhatsApp/Telegram/newsletter links without clutter.

Target funnel: ARTICLE -> ANOTHER ARTICLE -> FOLLOW/SUBSCRIBE -> RETURNING READER.

### 10. External distribution strategy
Create `docs/DISTRIBUTION_STRATEGY.md` covering owned channels, search/discovery and selective third-party communities. Community posting must be relevant, contextual and preferably administrator-approved; never a spam bot.

### 11. Channel setup checklist
Create `docs/CHANNEL_SETUP_CHECKLIST.md` split into AUTOMATIC / OWNER ACTION REQUIRED / OPTIONAL. Give exact minimal setup steps for X, WhatsApp Channel, Telegram Channel, Instagram, YouTube, Google Search Console and any future newsletter provider. Facebook remains OPTIONAL / CURRENTLY BLOCKED.
### 12. Publishing workflow
Future article publication should prepare canonical/SEO metadata, social card, structured data, sitemap/news sitemap, RSS, WhatsApp/X/Telegram/Instagram copy, short-video script, newsletter excerpt and tracked URLs from one workflow. Preparation is automatic; external posting is not.

### 13. First complete test case
Use `notas/laura-de-marinis-91-firmantes/` as the complete test. Verify canonical metadata, social card, structured data, sitemap(s), RSS, sharing controls, tracked links, distribution copy and analytics measurability. Reopen actual output after generation.

## Required pre-change inspection

Before implementation inspect repository structure, Git status, article HTML/templates, homepage, article navigation, metadata conventions, canonical/OG/X cards, robots, sitemaps, feeds, analytics, JS architecture, deployment/workflows, privacy implications, article images and URL structure.

Inspect existing work on `notas/laura-de-marinis-91-firmantes/` first. Preserve unrelated behavior.

## Change control

Before: `git status`.
After: `git diff`, existing tests/checks, HTML/JS/config validation and reopen generated output.
Do not overwrite unrelated user changes.

## Final reporting format for this job

Report only:
- IMPLEMENTED
- VERIFIED
- OWNER ACTION REQUIRED
- OPTIONAL LATER
- BLOCKED
- exact files changed

## Implementation status — 2026-09-25

DONE IN SOURCE: phases 1, 2, phase 3 sitemap/news technical files, 4, 5, 6, 7, 8 first-party measurement, 9 basic retention, 10, 11 documentation, and the technical portion of phase 13.

PARTIAL: phase 12 has a maintainable downstream generator for validation, sitemaps, RSS, distribution copy and tracked URLs; creation of a brand-new article/social-card asset is not yet one fully automated command.

OWNER ACTION REMAINS: Search Console ownership/sitemap submission; Supabase custom SMTP and full authenticated discussion test; explicit admin-profile assignment; external account/channel authorization.

CURRENT HOST LIMITATION: the repository cannot control the origin-root `/robots.txt` for the `floydskd-netizen.github.io` host while deployed only as the `/la-trama-publica/` project site.
