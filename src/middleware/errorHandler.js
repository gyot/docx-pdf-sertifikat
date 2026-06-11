const logger = require('../helpers/logger');
const { AppError } = require('../helpers/errors');

exports.notFoundHandler = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

exports.errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const payload = {
    status: 'error',
    message: err.message || 'Internal server error'
  };

  if (process.env.NODE_ENV === 'development') {
    payload.details = err.stack;
  }

  logger.error(`${req.method} ${req.originalUrl} - ${payload.message}`);

  res.status(statusCode).json(payload);
};
