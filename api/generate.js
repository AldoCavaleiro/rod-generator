const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');

module.exports = async (req, res) => {
  const { formato = 'pdf', tipo = 'contrato', artista = 'Artista', ciudad = 'Ciudad', fecha = '2025-01-01' } = req.query;

  const filename = `${tipo}_${artista}_${ciudad}_${fecha}`.replace(/\s/g, '_');

  if (formato === 'pdf') {
    const html = `
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h1>Contrato de actuación</h1>
          <p><strong>Artista:</strong> ${artista}</p>
          <p><strong>Ciudad:</strong> ${ciudad}</p>
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p>Este documento representa un acuerdo preliminar para la actuación.</p>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    return res.send(pdfBuffer);
  }

  if (formato === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Producción');

    sheet.columns = [
      { header: 'Tarea', key: 'tarea', width: 30 },
      { header: 'Responsable', key: 'responsable', width: 30 },
      { header: 'Hora', key: 'hora', width: 15 }
    ];

    sheet.addRow({ tarea: 'Montaje sonido', responsable: 'Técnico 1', hora: '10:00' });
    sheet.addRow({ tarea: 'Prueba sonido', responsable: 'Banda', hora: '12:00' });
    sheet.addRow({ tarea: 'Actuación', responsable: artista, hora: '20:00' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);
  }

  if (formato === 'csv') {
    const csv = `Tarea,Responsable,Hora\nMontaje sonido,Técnico 1,10:00\nPrueba sonido,Banda,12:00\nActuación,${artista},20:00\n`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }

  res.status(400).send('Formato no soportado. Usa pdf, xlsx o csv.');
};
