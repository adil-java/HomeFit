/**
 * Server logger. Quiet by default: only errors and warnings are printed, and
 * debug output (request traces, user data) is off unless LOG_LEVEL=debug.
 *
 *   LOG_LEVEL=silent | error | warn (default) | debug
 */
const LEVELS = { silent: 0, error: 1, warn: 2, debug: 3 };
const current = LEVELS[(process.env.LOG_LEVEL || 'warn').toLowerCase()] ?? LEVELS.warn;

// Print errors as "name: message" (plus stack only in debug), never as huge
// objects that can include request headers or tokens.
const fmt = (args) =>
  args.map((a) =>
    a instanceof Error ? (current >= LEVELS.debug ? a.stack : `${a.name}: ${a.message}`) : a
  );

const logger = {
  error: (...args) => current >= LEVELS.error && console.error(...fmt(args)),
  warn: (...args) => current >= LEVELS.warn && console.warn(...fmt(args)),
  debug: (...args) => current >= LEVELS.debug && console.log(...fmt(args)),
};

export default logger;
