/**
 * App logger. Silent by default — in release builds and in Expo Go — so users
 * never see raw errors, and the dev "red box" doesn't pop up for errors the
 * app already handles with a friendly message.
 *
 * To see logs while debugging, start Expo with:
 *   EXPO_PUBLIC_DEBUG_LOGS=1 npx expo start
 */
const enabled = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_LOGS === '1';

const noop = (..._args: unknown[]) => {};

export const logger = {
  log: enabled ? console.log.bind(console) : noop,
  info: enabled ? console.info.bind(console) : noop,
  debug: enabled ? console.debug.bind(console) : noop,
  // console.log (not console.warn/error) so handled errors don't open LogBox
  warn: enabled ? console.log.bind(console, '[warn]') : noop,
  error: enabled ? console.log.bind(console, '[error]') : noop,
};

export default logger;
