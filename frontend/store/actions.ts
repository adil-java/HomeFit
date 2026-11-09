import { createAction } from '@reduxjs/toolkit';

/**
 * Dispatched when the user signs out. The root reducer resets every slice that
 * holds one user's data (cart, wishlist, orders, notifications, screen cache),
 * so the next account on this device starts clean. Public data (products,
 * categories, search filters) is kept.
 */
export const resetUserData = createAction('session/resetUserData');
