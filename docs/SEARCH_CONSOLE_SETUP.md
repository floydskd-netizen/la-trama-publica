# La Trama Pública — Google Search Console Setup

Updated: 2026-09-25

## Prepared URLs
- Main sitemap: `https://floydskd-netizen.github.io/la-trama-publica/sitemap.xml`
- News sitemap: `https://floydskd-netizen.github.io/la-trama-publica/news-sitemap.xml`
- RSS: `https://floydskd-netizen.github.io/la-trama-publica/rss.xml`

## Owner steps
1. In Google Search Console add the URL-prefix property `https://floydskd-netizen.github.io/la-trama-publica/`.
2. Select HTML-tag verification if available and provide the generated verification value so it can be inserted into the homepage `<head>` and published.
3. Verify ownership.
4. Open Sitemaps and submit `sitemap.xml` and `news-sitemap.xml`.
5. Use URL Inspection for newly published articles when a manual check is useful.

## GitHub Pages robots.txt limitation
This site is currently a GitHub Pages project under `/la-trama-publica/`. The crawler-standard robots location is the origin root `https://floydskd-netizen.github.io/robots.txt`, which is outside this project repository and currently returns 404. The repository therefore keeps a project-level `robots.txt` as a ready reference, but it must not be described as authoritative on the current host. Direct sitemap submission in Search Console remains available. A custom domain or controllable origin-root site can later serve the authoritative robots file.

## Expectations
Sitemaps and structured data improve discovery and diagnostics; they do not guarantee Google News or Discover inclusion.
