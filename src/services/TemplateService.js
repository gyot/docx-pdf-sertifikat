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

exports.fillTemplate = async (data, templatePath) => {
  try {
    logger.info(`Rendering DOCX template ${templatePath}`);
    const content = await fs.readFile(templatePath);
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '${', end: '}' }
    });

    doc.setData(data);
    doc.render();

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
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
