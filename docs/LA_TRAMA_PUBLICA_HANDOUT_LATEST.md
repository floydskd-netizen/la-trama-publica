# La Trama Pública — Handout operativo vigente

Fecha: 2026-09-25
Repo activo: `D:\DEVELOPMENT\La_Trama_Publica\site`
Producción: `https://floydskd-netizen.github.io/la-trama-publica/`
Branch de producción: `main`
Último commit publicado relevante: `2d3fb29 Publish threaded discussion system`

## Regla editorial permanente

La Trama Pública no representa ni defiende a ningún partido político ni dirigente.
El portal debe ser imparcial partidariamente, pero firme frente a hechos verificables de abuso de poder, corrupción, violencia, engaño, autoritarismo o desprecio institucional, sin importar quién los cometa.
Separar siempre hechos, fuentes, testimonios, análisis e interpretación.
Los títulos pueden ser muy provocativos, pero no deben convertir una valoración política en un hecho probado.

## Identidad y UX ya implementadas

- Logo oficial de La Trama Pública integrado en portal, favicon, imágenes y tarjetas sociales.
- Selector ES/EN con banderas SVG reales.
- Portada con navegación rápida / últimas publicaciones.
- Tarjetas editoriales usan foto o visual significativo + titular + marca; no iniciales tipo `BN`.
- Open Graph / X cards implementadas en las notas actuales.
## Sistema de debate / comentarios

Supabase project: `La Trama Pública`
Project ref: `dttvbpcjbvqtwfzbxohb`
Region: `sa-east-1` (São Paulo)
Costo actual verificado al crear: US$0/mes.

Implementado y publicado:
- login por email / magic link;
- alias público;
- comentarios por artículo;
- respuestas anidadas;
- reportes;
- Realtime;
- rail de debate en pantallas suficientemente anchas;
- hilo completo debajo de la nota;
- aviso de privacidad ES/EN;
- registro privado server-side de IP, user-agent, tipo de dispositivo, navegador, OS, referrer, idioma, zona horaria, pantalla y geolocalización aproximada por IP cuando esté disponible;
- nunca mostrar IP ni metadatos técnicos a otros lectores;
- no usar GPS ni ubicación precisa sin consentimiento explícito.

Seguridad verificada:
- RLS activo;
- usuarios anónimos no pueden escribir;
- roles admin/moderator no son autoasignables;
- `access_events` no tiene políticas públicas deliberadamente;
- Edge Function `record-access` requiere JWT.
## Bloqueo actual: correo de autenticación

La configuración de URL de Supabase ya fue corregida y verificada visualmente:
- Site URL: `https://floydskd-netizen.github.io/la-trama-publica/`
- Redirect URL permitida: `https://floydskd-netizen.github.io/la-trama-publica/**`

El problema actual es `email rate limit exceeded` del SMTP integrado de Supabase.
El SMTP integrado es sólo adecuado para pruebas y tiene límites estrictos.

Pendiente obligatorio antes de considerar el login listo para público:
1. configurar SMTP propio en Supabase Auth;
2. opción recomendada por simplicidad: Resend, sin asumir pago ni crear cuenta sin autorización;
3. verificar envío real;
4. verificar login -> alias -> comentario -> respuesta -> reporte -> registro técnico;
5. revisar deliverability y privacidad.

NO seguir gastando magic links mientras el SMTP integrado esté limitado.

## Próximo frente de trabajo aprobado

Construir la base de distribución, descubrimiento, crecimiento de audiencia y medición de tráfico.
El website es la fuente canónica; redes, mensajería, buscadores, newsletters y comunidades son canales de distribución.
Facebook NO es requisito y está considerado OPTIONAL / FUTURE / MANUAL mientras la cuenta siga bloqueada por Meta.
Ver `docs/DISTRIBUTION_GROWTH_BACKLOG.md`.

## Distribution / growth implementado — 2026-09-25

Implementado y verificado en source:
- metadata de descubrimiento + JSON-LD en las 4 notas ES y las 2 traducciones EN;
- hreflang ES/EN donde existe traducción;
- `sitemap.xml`, `news-sitemap.xml` reciente y `rss.xml` generados por `tools/update-distribution.mjs`;
- controles de compartir WhatsApp / X / Telegram / Web Share / copiar enlace;
- UTM consistentes y captura de campaña antes de limpiar la URL visible;
- contenido de distribución reutilizable en `data/distribution.json` y `distribution/*.md`;
- navegación de retención con notas relacionadas, archivo y RSS;
- analítica first-party con pageviews, visitante aproximado por hash, referrer host, UTM, dispositivo y eventos de compartir;
- tabla Supabase `analytics_events` con RLS y sin acceso de tabla para anon/authenticated;
- Edge Function `record-analytics` publicada y verificada con ingreso HTTP 204 + hash SHA-256 de 64 caracteres;
- dashboard privado `admin/analytics.html` preparado; el RPC devuelve sólo agregados y exige rol `admin`;
- estrategia, checklist de canales, analítica y Search Console documentados.

Limitación conocida de `robots.txt`:
- el sitio actual es un GitHub Pages project site bajo `/la-trama-publica/`;
- el robots autoritativo debería vivir en `https://floydskd-netizen.github.io/robots.txt`, fuera de este repo, y esa URL actualmente devuelve 404;
- el repo conserva un `robots.txt` de referencia, pero no se lo considera autoritativo en el host actual.

Pendiente que requiere intervención del owner:
1. SMTP propio / Resend para Supabase Auth;
2. Google Search Console: verificar propiedad y enviar sitemaps;
3. autenticar la cuenta que será administradora y asignarle explícitamente rol `admin` (actualmente hay 0 perfiles admin);
4. autorizar/conectar cuentas de canales externos antes de cualquier publicación automática.
