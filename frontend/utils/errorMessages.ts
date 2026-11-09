/**
 * Turns any error (Firebase, network, server, Stripe, JS) into a short
 * sentence a user can understand. Use it wherever an error reaches a Toast,
 * Alert or inline message:
 *
 *   Toast.show({ type: 'error', text1: 'Could not save', text2: friendlyError(e) })
 */

const FIREBASE_AUTH: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/missing-password': 'Please enter your password.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Please choose a stronger password (at least 6 characters).',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/network-request-failed': 'No internet connection. Please check your network and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not available right now.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
  'auth/account-exists-with-different-credential': 'This email is already registered with a different sign-in method.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/internal-error': 'Something went wrong while signing in. Please try again.',
};

const NETWORK = /network request failed|failed to fetch|network error|timeout|timed out|ECONNREFUSED|ENOTFOUND|aborted|load failed/i;

// Text that clearly isn't meant for users (stack traces, code, library prefixes)
const TECHNICAL =
  /firebase|prisma|invocation|TypeError|ReferenceError|SyntaxError|undefined|null is not|is not a function|Cannot read|JSON|Unexpected token|status code|HTTP error|status:? ?\d{3}|\bat \w+ \(|https?:\/\/|\[object|_\w+_|\w+\/[\w-]+\)|stack/i;

export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;

  const err = error as { code?: unknown; message?: unknown };
  const code = typeof err.code === 'string' ? err.code : '';
  const message =
    typeof error === 'string' ? error : typeof err.message === 'string' ? err.message : '';

  // Firebase auth: by code, or by the "(auth/xxx)" inside the message
  const authCode = code.startsWith('auth/') ? code : message.match(/\((auth\/[\w-]+)\)/)?.[1];
  if (authCode) return FIREBASE_AUTH[authCode] ?? fallback;

  if (NETWORK.test(message)) {
    return 'No internet connection or the server is unreachable. Please try again.';
  }

  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 160 || TECHNICAL.test(trimmed)) return fallback;

  // Messages written for users by our own server/app pass through
  return trimmed;
}

/** Same as friendlyError, but keeps the error code for callers that branch on it. */
export class FriendlyError extends Error {
  code?: string;
  constructor(original: unknown, fallback?: string) {
    super(friendlyError(original, fallback));
    this.name = 'FriendlyError';
    const code = (original as { code?: unknown })?.code;
    if (typeof code === 'string') this.code = code;
  }
}
