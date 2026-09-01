const axios = require('axios');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../helpers/errors');
const logger = require('../helpers/logger');
const { TEMP_BASE_PATH } = require('../config');

const templateDir = path.join(TEMP_BASE_PATH, 'templates');
const docxDir = path.join(TEMP_BASE_PATH, 'docx');

exports.downloadTemplate = async (url) => {
  try {
    logger.info(`Downloading template from ${url}`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      validateStatus: (status) => status < 400
    });

    await fs.ensureDir(templateDir);
    const filename = `${uuidv4()}.docx`;
    const filePath = path.join(templateDir, filename);
    await fs.writeFile(filePath, response.data);

    logger.info(`Template downloaded to ${filePath}`);
    return filePath;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new AppError('Template not found', 404);
    }
    if (error.code === 'ECONNABORTED') {
      throw new AppError('Template download timed out', 504);
    }
    throw new AppError(`Failed to download template: ${error.message}`, 502);
  }
};

function injectQrCode(docxBuffer, qrPngBuffer) {
  logger.info(`[QR] Starting injectQrCode - buffer: ${qrPngBuffer.length} bytes`);
  const zip = new PizZip(docxBuffer);

  zip.file('word/media/qrcode.png', qrPngBuffer);
  logger.info('[QR] Added qrcode.png to word/media/');

  const contentTypesFile = zip.file('[Content_Types].xml');
  if (contentTypesFile) {
    let ct = contentTypesFile.asText();
    if (!ct.includes('Extension="png"')) {
      ct = ct.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
      zip.file('[Content_Types].xml', ct);
      logger.info('[QR] Updated [Content_Types].xml with PNG extension');
    } else {
      logger.info('[QR] [Content_Types].xml already has PNG extension');
    }
  }

  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    let rels = relsFile.asText();
    if (!rels.includes('rIdQR')) {
      rels = rels.replace(
        '</Relationships>',
        '<Relationship Id="rIdQR" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/qrcode.png"/></Relationships>'
      );
      zip.file('word/_rels/document.xml.rels', rels);
      logger.info('[QR] Added rIdQR relationship to document.xml.rels');
    } else {
      logger.info('[QR] rIdQR relationship already exists');
    }
  }

  let docXml = zip.file('word/document.xml').asText();

  const qrSize = 1270000;
  const drawingXml = [
    '<w:r>',
    '<w:drawing>',
    `<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">`,
    `<wp:extent cx="${qrSize}" cy="${qrSize}"/>`,
    '<wp:docPr id="100" name="QRCode"/>',
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
    '<pic:nvPicPr>',
    '<pic:cNvPr id="100" name="qrcode.png"/>',
    '<pic:cNvPicPr/>',
    '</pic:nvPicPr>',
    '<pic:blipFill>',
    '<a:blip r:embed="rIdQR" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>',
    '<a:stretch><a:fillRect/></a:stretch>',
    '</pic:blipFill>',
    '<pic:spPr>',
    '<a:xfrm>',
    '<a:off x="0" y="0"/>',
    `<a:ext cx="${qrSize}" cy="${qrSize}"/>`,
    '</a:xfrm>',
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
    '</pic:spPr>',
    '</pic:pic>',
    '</a:graphicData>',
    '</a:graphic>',
    '</wp:inline>',
    '</w:drawing>',
    '</w:r>'
  ].join('');

  const placeholder = '__QR_CODE__';
  logger.info(`[QR] Searching for placeholder "${placeholder}" in document.xml (${docXml.length} chars)`);

  if (docXml.includes(placeholder)) {
    const count = (docXml.match(new RegExp(placeholder, 'g')) || []).length;
    logger.info(`[QR] Direct match found (${count} occurrence(s)), replacing with drawing XML...`);
    docXml = docXml.replace(new RegExp(placeholder, 'g'), drawingXml);
    zip.file('word/document.xml', docXml);
    logger.info('[QR] SUCCESS: QR code image injected into DOCX (direct match)');
  } else {
    logger.warn(`[QR] Direct match NOT found, trying split-run regex...`);
    const escapedChars = placeholder.split('').map(c =>
      c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const splitPattern = escapedChars.join('(?:<[^>]*>)*');
    const splitRegex = new RegExp(splitPattern, 'g');

    if (splitRegex.test(docXml)) {
      logger.info('[QR] Split-run match found, replacing...');
      docXml = docXml.replace(splitRegex, drawingXml);
      zip.file('word/document.xml', docXml);
      logger.info('[QR] SUCCESS: QR code image injected into DOCX (split-run match)');
    } else {
      logger.error(`[QR] FAILED: Placeholder "${placeholder}" NOT found in document.xml`);
      logger.warn('[QR] The template DOCX must contain "{kode_qr}" text');
    }
  }

  return zip.generate({ type: 'nodebuffer' });
}

exports.fillTemplate = async (data, templatePath, qrPngBuffer = null) => {
  try {
    logger.info(`Rendering DOCX template ${templatePath}`);
    const content = await fs.readFile(templatePath);
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    doc.render(data);

    let buffer = doc.getZip().generate({ type: 'nodebuffer' });

    logger.info(`[QR] qrPngBuffer in fillTemplate: ${qrPngBuffer ? `${qrPngBuffer.length} bytes` : 'NULL - QR will be SKIPPED'}`);
    if (qrPngBuffer) {
      buffer = injectQrCode(buffer, qrPngBuffer);
    } else {
      logger.warn('[QR] Skipping QR injection - no buffer');
    }

    await fs.ensureDir(docxDir);
    const outputPath = path.join(docxDir, `${uuidv4()}.docx`);
    await fs.writeFile(outputPath, buffer);

    logger.info(`Rendered DOCX saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new AppError('Template file cannot be read', 500);
    }
    if (error.properties && error.properties.errors) {
      const errors = error.properties.errors
        .map((e) => (e.properties && e.properties.explanation) || e.message)
        .join('; ');
      throw new AppError(`Template render failed: ${errors}`, 500);
    }
    throw new AppError(`Template render failed: ${error.message}`, 500);
  }
};
