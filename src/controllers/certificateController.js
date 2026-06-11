const fs = require('fs-extra');
const CertificateService = require('../services/CertificateService');
const { AppError } = require('../helpers/errors');
const { safeRemove } = require('../helpers/fileHelper');
const logger = require('../helpers/logger');

exports.generateCertificate = async (req, res, next) => {
  const cleanupFiles = [];

  try {
    const { id_sertifikat } = req.body;

    if (id_sertifikat == null || id_sertifikat === '') {
      throw new AppError('Field id_sertifikat is required', 400);
    }

    const parsedId = Number(id_sertifikat);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      throw new AppError('Field id_sertifikat must be a positive number', 400);
    }

    const result = await CertificateService.generateCertificate(parsedId);

    if (!result || !result.pdfPath) {
      throw new AppError('PDF generation failed', 500);
    }

    cleanupFiles.push(result.templatePath, result.filledDocxPath, result.pdfPath);

    const filename = 'sertifikat.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stream = fs.createReadStream(result.pdfPath);

    stream.on('error', (err) => {
      logger.error(`Stream error while sending PDF: ${err.message}`);
      if (!res.headersSent) {
        next(err);
      }
      Promise.all(cleanupFiles.map(safeRemove));
    });

    stream.pipe(res);

    res.on('finish', () => {
      Promise.all(cleanupFiles.map(safeRemove));
    });
  } catch (error) {
    if (cleanupFiles.length > 0) {
      Promise.all(cleanupFiles.map(safeRemove));
    }
    next(error);
  }
};
