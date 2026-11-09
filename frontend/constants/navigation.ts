/**
 * Shared screen-transition settings so every navigator in the app animates the
 * same way. Without these, each Stack falls back to platform defaults (fade-up
 * on Android, slide on iOS) and screens feel inconsistent.
 *
 * Use `stackScreenOptions` as `screenOptions` on every <Stack>.
 */

// Standard push/pop: slide in from the right on both Android and iOS.
export const stackScreenOptions = {
  headerShown: false,
  animation: 'ios_from_right',
  gestureEnabled: true,
  // iOS: swipe back from anywhere on the screen, not just the left edge
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
} as const;

// Switching whole sections (logged-out ↔ logged-in) and immersive viewers
// (3D model / AR): a soft cross-fade instead of a slide.
export const fadeScreenOptions = {
  animation: 'fade',
} as const;

// Bottom tabs: a short horizontal shift when switching tabs.
export const tabsAnimation = 'shift' as const;
