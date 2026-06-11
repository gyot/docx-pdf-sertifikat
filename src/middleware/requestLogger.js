const logger = require('../helpers/logger');

exports.requestLogger = (req, res, next) => {
  logger.info(`Incoming request ${req.method} ${req.originalUrl}`);
  next();
};
