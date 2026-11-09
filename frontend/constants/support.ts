/**
 * Customer support contact. Set these in frontend/.env, e.g.
 *   EXPO_PUBLIC_SUPPORT_PHONE=+923001234567
 *   EXPO_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
 * Screens hide the "Need help?" buttons that aren't configured.
 */
export const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE?.trim() || '';
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || '';
