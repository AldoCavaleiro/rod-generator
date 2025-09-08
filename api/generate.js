// api/generate.js — Vercel Serverless (CommonJS). Sin Puppeteer/Chromium.
// PDF con pdf-lib, Excel con exceljs, CSV simple.

const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const ExcelJS = require("exceljs");

/** Sanitiza nombre de archivo */
function safeName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120) || "archivo";
}

/** Construye PDF simple con tabla */
async function buildPdf({ tipo, artista, ciudad, fecha, extra }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);

  const draw = (t, x, y, s = 12, b = false, c = rgb(0.07, 0.07, 0.07)) =>
    page.drawText(String(t), { x, y, size: s, font: b ? helvB : helv, color: c });

  const M = 48; let y = 800;

  // Título y meta
  draw((tipo || "Documento").toUpperCase(), M, y, 20, true); y -= 18;
  draw(`Artista: ${artista || "-"}  ·  Ciudad: ${ciudad || "-"}  ·  Fecha: ${fecha || "-"}`, M, y, 10, false, rgb(0.35,0.35,0.35)); y -= 26;

  // Caja info
  const boxH = 44;
  page.drawRectangle({ x: M, y: y - boxH, width: 595.28 - M*2, height: boxH, color: rgb(1,1,1), borderColor: rgb(0.85,0.87,0.91), borderWidth: 1 });
  draw("Documento operativo generado por Rod. No es asesoría legal o fiscal.", M + 10, y - 16, 11); y -= (boxH + 20);

  // Contenido
  draw("Contenido", M, y, 14, true, rgb(0.25,0.25,0.25)); y -= 18;
  draw((extra && String(extra).trim()) ? String(extra).slice(0, 500) : "Contenido personalizable con ?extra=...", M, y, 11); y -= 40;

  // Tabla
  draw("Plan base", M, y, 14, true, rgb(0.25,0.25,0.25)); y -= 16;
  const colW = [220, 170, 100]; const rowH = 20;
  const rows = [
    ["Tarea", "Responsable", "Hora", true],
    ["Montaje sonido", "Técnico 1", "10:00"],
    ["Prueba sonido", "Banda", "12:00"],
    ["Actuación", artista || "Artista", "20:00"]
  ];
  rows.forEach((r, i) => {
    const yy = y - i * rowH;
    const width = colW.reduce((a,b)=>a+b,0);
    page.drawRectangle({
      x: M, y: yy - rowH + 4, width,
      height: rowH, color: r[3] ? rgb(0.95,0.96,0.98) : rgb(1,1,1),
      borderColor: rgb(0.85,0.87,0.91), borderWidth: 1
    });
    let cx = M + 8;
    draw(r[0], cx, yy - 11, 10, !!r[3]); cx += colW[0];
    draw(r[1], cx, yy - 11, 10, !!r[3]); cx += colW[1];
    draw(r[2], cx, yy - 11, 10, !!r[3]);
  });

  // Footer
  draw(`Generado automáticamente • ${new Date().toISOString()}`, M, 36, 9, false, rgb(0.45,0.45,0.45));

  return Buffer.from(await pdf.save());
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

    // CSV
    if (f === "csv") {
      const rows = [
        ["Tarea", "Responsable", "Hora"],
        ["Montaje sonido", "Técnico 1", "10:00"],
        ["Prueba sonido", "Banda", "12:00"],
        ["Actuación", artista, "20:00"]
      ];
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      return res.status(200).send(csv);
    }

    // XLSX
    if (f === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const sh = wb.addWorksheet("Producción");
      sh.columns = [
        { header: "Tarea", key: "tarea", width: 32 },
        { header: "Responsable", key: "responsable", width: 28 },
        { header: "Hora", key: "hora", width: 12 }
      ];
      sh.addRow({ tarea: "Montaje sonido", responsable: "Técnico 1", hora: "10:00" });
      sh.addRow({ tarea: "Prueba sonido", responsable: "Banda", hora: "12:00" });
      sh.addRow({ tarea: "Actuación", responsable: artista, hora: "20:00" });
      sh.getRow(1).font = { bold: true };
      sh.autoFilter = { from: "A1", to: "C1" };
      const buf = await wb.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      return res.status(200).send(Buffer.from(buf));
    }

    // PDF
    if (f === "pdf") {
      const pdfBuffer = await buildPdf({ tipo, artista, ciudad, fecha, extra });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    return res.status(400).send("Formato no soportado. Usa ?formato=pdf|xlsx|csv");
  } catch (e) {
    console.error("ERROR /api/generate:", e);
    return res.status(500).send("Error generando el archivo");
  }
};
