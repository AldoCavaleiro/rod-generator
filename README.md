# Rod Generator

Backend serverless (Vercel) para generar archivos **PDF**, **Excel (.xlsx)** y **CSV** con parámetros por URL. Optimizado para funcionar en **Vercel** usando `puppeteer-core` + `@sparticuz/chromium`.

## Endpoints

**Base:** `https://<TU-PROYECTO>.vercel.app/api/generate`

### Parámetros comunes
- `formato`: `pdf` | `xlsx` | `csv`
- `tipo`: texto para nombrar el archivo (ej: `contrato`, `cronograma`)
- `artista`: nombre del artista
- `ciudad`: ciudad
- `fecha`: fecha (ej: `2025-10-15`)
- `extra`: texto adicional para PDF (opcional)

### Ejemplos
- PDF  

