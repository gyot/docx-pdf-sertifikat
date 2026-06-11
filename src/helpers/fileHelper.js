const fs = require('fs-extra');
const logger = require('./logger');

exports.safeRemove = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.remove(filePath);
    logger.info(`Deleted temporary file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed cleanup for ${filePath}: ${error.message}`);
  }
};

exports.cleanTempDir = async (tempBasePath) => {
  const fsSync = require('fs');
  const path = require('path');
  const dirs = ['templates', 'docx', 'pdf'];
  for (const dir of dirs) {
    const dirPath = path.join(tempBasePath, dir);
    try {
      if (fsSync.existsSync(dirPath)) {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          await fs.remove(path.join(dirPath, file));
        }
        logger.info(`Cleaned temp directory: ${dirPath} (${files.length} files removed)`);
      }
    } catch (error) {
      logger.error(`Failed to clean temp directory ${dirPath}: ${error.message}`);
    }
  }
};
