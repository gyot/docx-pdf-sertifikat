const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const certificateRoutes = require('./routes/certificateRoutes');
const { requestLogger } = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require('./config');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(requestLogger);
app.use(
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
  })
);

app.use('/generate-certificate', certificateRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
