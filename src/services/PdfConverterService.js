const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { AppError } = require('../helpers/errors');
const logger = require('../helpers/logger');
const { TEMP_BASE_PATH } = require('../config');

const pdfDir = path.join(TEMP_BASE_PATH, 'pdf');

exports.convertDocxToPdf = async (docxPath) => {
  await fs.ensureDir(pdfDir);

  logger.info(`Converting DOCX to PDF via LibreOffice: ${docxPath}`);

  return new Promise((resolve, reject) => {
    execFile(
      'libreoffice',
      ['--headless', '--convert-to', 'pdf', docxPath, '--outdir', pdfDir],
      { timeout: 120000 },
      async (error, stdout, stderr) => {
        if (error) {
          logger.error('LibreOffice conversion failed', stderr || stdout || error.message);
          return reject(new AppError('LibreOffice conversion failed', 500));
        }

        const pdfPath = path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

        try {
          if (!(await fs.pathExists(pdfPath))) {
            throw new AppError('PDF not found after conversion', 500);
          }
          logger.info(`PDF generated at ${pdfPath}`);
          resolve(pdfPath);
        } catch (fsError) {
          reject(new AppError(`PDF conversion output missing: ${fsError.message}`, 500));
        }
      }
    );
  });
};
