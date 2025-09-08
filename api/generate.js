// api/generate.js — Vercel Serverless (CommonJS), sin Puppeteer.
// PDF con pdf-lib, Excel con exceljs, CSV simple.

const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const ExcelJS = require("exceljs");

/** Util: sanitiza nombre de archivo */
function safeName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120) || "archivo";
}

/** Construye un PDF básico y limpio con tabla simple */
async function buildPdf({ tipo, artista, ciudad, fecha, extra }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 pt
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text, x, y, size = 12, bold = false, color = rgb(0.07, 0.07, 0.07)) => {
    page.drawText(text, { x, y, size, font: bold ? fontBold : font, color });
  };

  const marginX = 48;
  let cursorY = 800;

  // Título
  drawText((tipo || "Documento").toUpperCase(), marginX, cursorY, 20, true);
  cursorY -= 18;

  // Meta
  const meta = `Artista: ${artista || "-"}  ·  Ciudad: ${ciudad || "-"}  ·  Fecha: ${fecha || "-"}`;
  drawText(meta, marginX, cursorY, 10, false, rgb(0.35, 0.35, 0.35));
  cursorY -= 26;

  // Caja aviso
  const boxTop = cursorY;
  const boxHeight = 44;
  page.drawRectangle({
    x: marginX,
    y: boxTop - boxHeight,
    width: 595.28 - marginX * 2,
    height: boxHeight,
    borderColor: rgb(0.85, 0.87, 0.91),
    borderWidth: 1,
    color: rgb(1, 1, 1)
  });
  drawText("Documento operativo generado por Rod. No es asesoría legal o fiscal.", marginX + 10, boxTop - 16, 11);
  cursorY = boxTop - boxHeight - 20;

  // Contenido
  drawText("Contenido", marginX, cursorY, 14, true, rgb(0.25, 0.25, 0.25));
  cursorY -= 18;

  const paragraph = (extra && String(extra).trim().length > 0)
    ? String(extra)
    : "Contenido personalizable con el parámetro ?extra=...";
  drawText(paragraph.slice(0, 500), marginX, cursorY, 11);
  cursorY -= 40;

  // Tabla simple
  drawText("Plan base", marginX, cursorY, 14, true, rgb(0.25, 0.25, 0.25));
  cursorY -= 16;

  const tableX = marginX;
  const colW = [220, 170, 100];
  const rowH = 20;
  const rows = [
    ["Tarea", "Responsable", "Hora", true],
    ["Montaje sonido", "Técnico 1", "10:00"],
    ["Prueba sonido", "Banda", "12:00"],
    ["Actuación", artista || "Artista", "20:00"]
  ];

  rows.forEach((r, idx) => {
    const y = cursorY - idx * rowH;
    // fondo header
    if (r[3]) {
      page.drawRectangle({
        x: tableX,
        y: y - rowH + 4,
        width: colW.reduce((a, b) => a + b, 0),
        height: rowH,
        color: rgb(0.95, 0.96, 0.98),
        borderColor: rgb(0.85, 0.87, 0.91),
        borderWidth: 1
      });
    } else {
      page.drawRectangle({
        x: tableX,
        y: y - rowH + 4,
        width: colW.reduce((a, b) => a + b, 0),
        height: rowH,
        borderColor: rgb(0.85, 0.87, 0.91),
        borderWidth: 1,
        color: rgb(1, 1, 1)
      });
    }
    // celdas
    let cx = tableX + 8;
    drawText(String(r[0]), cx, y - 11, 10, !!r[3]); cx += colW[0];
    drawText(String(r[1]), cx, y - 11, 10, !!r[3]); cx += colW[1];
    drawText(String(r[2]), cx, y - 11, 10, !!r[3]);
  });

  // Footer
  drawText(`Generado automáticamente · ${new Date().toISOString()}`, marginX, 36, 9, false, rgb(0.45, 0.45, 0.45));

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/** Handler */
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

    // ============== CSV =================
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

    // ============== XLSX ================
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

    // =============== PDF ===============
    if (f === "pdf") {
      const pdfBuffer = await buildPdf({ tipo, artista, ciudad, fecha, extra });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    return res.status(400).send("Formato no soportado. Usa ?formato=pdf|xlsx|csv");
  } catch (err) {
    console.error("ERROR /api/generate:", err);
    return res.status(500).send("Error generando el archivo");
  }
};

