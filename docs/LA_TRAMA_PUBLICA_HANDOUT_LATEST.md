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
## Autenticación vigente — verificada 2026-09-25

El login público ya no usa magic links. Flujo actual:
- SMTP personalizado de Supabase configurado con Gmail App Password;
- `signInWithOtp()` envía un código numérico por email;
- el lector ingresa el código en la misma nota;
- `verifyOtp(..., type: "email")` crea la sesión;
- la sesión se persiste en el navegador mediante Supabase;
- luego se solicita alias público una sola vez para comentar o aportar.

Se corrigió además la divergencia de deploy: GitHub Pages y Cloudflare Pages deben publicarse juntos porque `latramapublica.pages.dev` es un proyecto de direct upload sin conexión Git.

## Verificación colaborativa / aportes de lectores — 2026-09-25

Implementado en base y source:
- formulario por nota para aportar URL/documento público y explicar qué verifica;
- clasificación: confirma, contradice, agrega contexto, corrección, documento u otro;
- estados: recibido, en revisión, verificado, no incorporado;
- nombre elegido para créditos y perfil/sitio público opcional;
- contacto privado en tabla separada, no en perfiles públicos;
- permiso explícito para que La Trama Pública contacte al colaborador;
- opt-in independiente para publicar ese dato de contacto junto al crédito;
- aportes verificados visibles públicamente con la atribución elegida;
- cola privada `admin/contributions.html` para admin/moderator;
- `contributor_profiles`, `contributor_contacts` y `evidence_submissions` con RLS y sin grants directos para `anon`/`authenticated`;
- exposición pública únicamente por RPC y sólo para aportes `verified`.

Estado de roles al implementar: 1 perfil `reader`, 0 `admin`. No se promovió ninguna cuenta automáticamente. La moderación web requiere asignar explícitamente rol `admin` o `moderator` a la cuenta del owner.

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
- `node tools/prepare-publication.mjs` ejecuta en un solo comando la instalación/validación del cliente de crecimiento y la regeneración de discovery/distribution;
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
1. Google Search Console: verificar propiedad y enviar sitemaps;
2. asignar explícitamente rol `admin` o `moderator` a la cuenta del owner para usar moderación/analítica;
3. autorizar/conectar cuentas de canales externos antes de cualquier publicación automática.


## Participación general / buzón de información — 2026-09-25

Implementado en base/source:
- formulario público general sin login: dato/pista, fuente, documento, corrección, propuesta de investigación u otro;
- tema, explicación, URL opcional y archivo opcional de hasta 10 MB;
- nombre/alias y contacto opcionales;
- permisos separados para contacto privado, crédito público y publicación del contacto;
- destino de notificaciones guardado server-side en `portal_private_settings`, nunca expuesto en HTML/JS/respuesta del endpoint;
- archivos en bucket privado `contribution-files`;
- tabla `general_contributions` con RLS y sin grants públicos;
- Edge Function `receive-contribution` valida, guarda y prepara email con encabezados correspondientes al formulario;
- cola administrativa unificada en `admin/contributions.html`: información general + aportes a notas existentes.

Pendiente para activar el email automático: agregar a los secrets de Edge Functions la misma Google App Password usada por SMTP Auth con nombre `GMAIL_APP_PASSWORD`. El endpoint ya guarda el aporte aunque la notificación por email no pueda enviarse.


## Regla de QA antes de publicar

Antes de cualquier commit, push o deploy, ejecutar QA de texto y render: UTF-8 válido, ausencia de mojibake, ortografía, tildes, signos de puntuación y copy visible correcto en español e inglés. No publicar si aparecen caracteres de reemplazo, signos de interrogación dentro de palabras, secuencias típicas de mojibake o texto visible mal escrito. Ejecutar python scripts/check_text_quality.py y verificar además la página renderizada/live.
