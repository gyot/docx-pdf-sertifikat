const info = (...args) => console.log('[INFO]', ...args);
const warn = (...args) => console.warn('[WARN]', ...args);
const error = (...args) => console.error('[ERROR]', ...args);

module.exports = { info, warn, error };
