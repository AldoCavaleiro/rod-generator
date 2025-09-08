// api/generate.js (CommonJS, compatible con @vercel/node)
// Importaciones ligeras arriba. Puppeteer se carga SOLO si pides PDF.
const ExcelJS = require("exceljs");

/** Sanitiza nombre de archivo */
function safeName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120) || "archivo";
}

/** Plantilla HTML para PDF */
function buildHTML({ tipo, artista, ciudad, fecha, extra }) {
  const title = (tipo || "Documento").toUpperCase();
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} - ${artista || ""}</title>
<style>
  :root { --c1:#111827; --c2:#374151; --c3:#6B7280; --b:#F9FAFB; --p:#111827; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: var(--p); background: #fff; margin:0; }
  .page { padding: 36px 48px; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  h2 { margin: 24px 0 8px; font-size: 16px; color: var(--c2); }
  p, li, td, th { font-size: 12px; line-height: 1.45; color: var(--c1); }
  .meta { margin: 12px 0 16px; color: var(--c3); }
  .box { border:1px solid #E5E7EB; border-radius:8px; padding:12px 14px; margin: 10px 0; }
  table { width:100%; border-collapse: collapse; margin:8px 0 12px; }
  th, td { border:1px solid #E5E7EB; padding:8px; text-align:left; }
  th { background:#F3F4F6; }
  footer { margin-top: 24px; font-size: 10px; color: var(--c3); }
</style>
</head>
<body>
  <div class="page">
    <h1>${title}</h1>
    <div class="meta">Artista: <strong>${artista || "-"}</strong> · Ciudad: <strong>${ciudad || "-"}</strong> · Fecha: <strong>${fecha || "-"}</strong></div>
    <div class="box">
      <p>Documento operativo generado por el agente Rod. No constituye asesoría legal o fiscal.</p>
    </div>

    <h2>Contenido</h2>
    <p>${extra || "Contenido personalizable vía parámetro ?extra=..."}</p>

    <h2>Plan base</h2>
    <table>
      <thead><tr><th>Tarea</th><th>Responsable</th><th>Hora</th></tr></thead>
      <tbody>
        <tr><td>Montaje sonido</td><td>Técnico 1</td><td>10:00</td></tr>
        <tr><td>Prueba sonido</td><td>Banda</td><td>12:00</td></tr>
        <tr><td>Actuación</td><td>${artista || "Artista"}</td><td>20:00</td></tr>
      </tbody>
    </table>

    <footer>Generado automáticamente · Rod · ${new Date().toISOString()}</footer>
  </div>
</body>
</html>`;
}

/** Lanza navegador solo en PDF (serverless-friendly) */
async function launchBrowser() {
  // Carga perezosa para evitar errores cuando NO es PDF
  const chromium = await import("@sparticuz/chromium");
  const puppeteer = await import("puppeteer-core");

  const execPath = await chromium.default.executablePath();
  return puppeteer.default.launch({
    args: chromium.default.args,
    defaultViewport: chromium.default.defaultViewport,
    executablePath: execPath,
    headless: chromium.default.headless
  });
}

module.exports = async (req, res) => {
  try {
    const {
      formato = "pdf",
      tipo = "contrato",
      artista = "Artista",
      ciudad = "Ciudad",
      fecha = "2025-01-01",
      extra = ""
    } = req.query || {};

    const filename = safeName(`${tipo}_${artista}_${ciudad}_${fecha}`);
    const f = String(formato).toLowerCase();

    // ========================= PDF =========================
    if (f === "pdf") {
      const html = buildHTML({ tipo, artista, ciudad, fecha, extra });

      const browser = await launchBrowser();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "14mm", right: "12mm", bottom: "16mm", left: "12mm" }
      });
      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    // ========================= XLSX ========================
    if (f === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Producción");

      sheet.columns = [
        { header: "Tarea", key: "tarea", width: 32 },
        { header: "Responsable", key: "responsable", width: 28 },
        { header: "Hora", key: "hora", width: 12 }
      ];

      sheet.addRow({ tarea: "Montaje sonido", responsable: "Técnico 1", hora: "10:00" });
      sheet.addRow({ tarea: "Prueba sonido", responsable: "Banda", hora: "12:00" });
      sheet.addRow({ tarea: "Actuación", responsable: artista, hora: "20:00" });

      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = { from: "A1", to: "C1" };

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      return res.status(200).send(Buffer.from(buffer));
    }

    // ========================= CSV =========================
    if (f === "csv") {
      const rows = [
        ["Tarea", "Responsable", "Hora"],
        ["Montaje sonido", "Técnico 1", "10:00"],
        ["Prueba sonido", "Banda", "12:00"],
        ["Actuación", artista, "20:00"]
      ];
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      return res.status(200).send(csv);
    }

    // Formato no soportado
    return res.status(400).send("Formato no soportado. Usa ?formato=pdf|xlsx|csv");
  } catch (err) {
    console.error("Error en /api/generate:", err);
    return res.status(500).send("Error generando el archivo");
  }
};
