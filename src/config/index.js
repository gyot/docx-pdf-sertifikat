const path = require('path');

const TEMP_BASE_PATH = path.resolve(__dirname, '../../temp');

const LARAVEL_API_URL = process.env.LARAVEL_API_URL;
if (!LARAVEL_API_URL) {
  console.warn('WARNING: LARAVEL_API_URL environment variable is not set. API calls will fail.');
}

module.exports = {
  PORT: process.env.PORT || 4000,
  LARAVEL_API_URL: LARAVEL_API_URL || '',
  LARAVEL_API_TOKEN: process.env.LARAVEL_API_TOKEN || '',
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  RATE_LIMIT_MAX: 100,
  TEMP_BASE_PATH
};
