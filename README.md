# Rod Generator

Backend serverless (Vercel) para generar **PDF**, **XLSX** y **CSV** con parámetros por URL.
Compatible con Vercel usando `puppeteer-core` + `@sparticuz/chromium` (solo cuando pides PDF).

## Uso (DOMINIO REAL)

- PDF:
  https://rod-generator.vercel.app/api/generate?formato=pdf&tipo=contrato&artista=La%20Pegatina&ciudad=Madrid&fecha=2025-10-15&extra=Adjuntar%20rider%20tecnico

- XLSX:
  https://rod-generator.vercel.app/api/generate?formato=xlsx&tipo=cronograma&artista=Rozalen&ciudad=Sevilla&fecha=2025-11-01

- CSV:
  https://rod-generator.vercel.app/api/generate?formato=csv&tipo=rider&artista=Rayden&ciudad=Granada&fecha=2025-12-20

